from howlongtobeatpy import HowLongToBeat

from config import CACHE_ENABLED, FETCH_STEAM_REVIEWS, HLTB_CACHE_MAX_AGE_DAYS
from .cache_store import LibraryCache
from .game_schema import cache_entry_to_game, hltb_result_to_cache, steam_game_to_game
from .image_cache import ensure_image
from .steam_api_handler import SteamApiHandler
from .steam_hidden_games import filter_hidden_games, public_hidden_meta


class LibraryService:
    @staticmethod
    def games_from_cache(steam_id):
        cache = LibraryCache(steam_id)
        cache.load()
        games = []
        for entry in cache._data.get('games', {}).values():
            games.append(cache_entry_to_game(entry))
        games.sort(key=lambda game: game['steamName'].lower())
        return cache, games

    @staticmethod
    def is_sync_complete(cache, app_ids):
        if not CACHE_ENABLED:
            return False
        if not app_ids:
            return True
        return cache.count_cached_hltb(app_ids, HLTB_CACHE_MAX_AGE_DAYS) == len(app_ids)

    @staticmethod
    def is_reviews_complete(cache, app_ids):
        if not CACHE_ENABLED or not FETCH_STEAM_REVIEWS:
            return True
        if not app_ids:
            return True
        return cache.count_cached_steam_reviews(app_ids) == len(app_ids)

    @staticmethod
    def get_library(steam_id, show_hidden=None):
        api_handler = SteamApiHandler()
        steam_games = api_handler.get_owned_games(steam_id)

        if steam_games is None:
            return {'error': 'Steam API key is not configured. Add STEAM_API_KEY to config.local.py.'}

        if not steam_games:
            return {'error': 'No games returned. Check your Steam ID and that your game library is public.'}

        steam_games, hidden_meta = filter_hidden_games(steam_games, steam_id, show_hidden=show_hidden)
        if not steam_games:
            if hidden_meta.get('hidden_filtered', 0) > 0:
                return {
                    'error': (
                        'All returned games are marked hidden in your Steam client. '
                        'Set SHOW_HIDDEN_GAMES = True in config.local.py to include them.'
                    ),
                }
            return {'error': 'No games to display after applying filters.'}

        cache = LibraryCache(steam_id)
        if CACHE_ENABLED:
            cache.load()

        games = []
        for steam_game in steam_games:
            cached_entry = cache.get_game(steam_game['appid']) if CACHE_ENABLED else None
            games.append(steam_game_to_game(steam_game, cached_entry))

        games.sort(key=lambda game: game['steamName'].lower())
        app_ids = [game['appId'] for game in games]
        cached_reviews = cache.count_cached_steam_reviews(app_ids) if CACHE_ENABLED else 0

        return {
            'meta': {
                'steamId': str(steam_id),
                'libraryFetchedAt': cache._data.get('library_fetched_at') if CACHE_ENABLED else None,
                'totalGames': len(games),
                'hiddenFiltered': hidden_meta.get('hidden_filtered', 0),
                'hiddenInLibrary': hidden_meta.get('hidden_in_library', 0),
                'hiddenDetection': hidden_meta.get('hidden_detection'),
                'hiddenDebug': hidden_meta.get('hidden_debug'),
                'showHiddenGames': hidden_meta.get('hidden_debug', {}).get('showHiddenGames'),
                'syncComplete': LibraryService.is_sync_complete(cache, app_ids),
                'reviewsComplete': LibraryService.is_reviews_complete(cache, app_ids),
                'cachedReviews': cached_reviews,
            },
            'games': games,
        }

    @staticmethod
    def iter_sync(steam_id, show_hidden=None):
        api_handler = SteamApiHandler()
        steam_games = api_handler.get_owned_games(steam_id)

        if steam_games is None:
            yield {'type': 'error', 'message': 'Steam API key is not configured. Add STEAM_API_KEY to config.local.py.'}
            return

        if not steam_games:
            yield {'type': 'error', 'message': 'No games returned. Check your Steam ID and that your game library is public.'}
            return

        steam_games, hidden_meta = filter_hidden_games(steam_games, steam_id, show_hidden=show_hidden)
        if not steam_games:
            if hidden_meta.get('hidden_filtered', 0) > 0:
                yield {
                    'type': 'error',
                    'message': (
                        'All returned games are marked hidden in your Steam client. '
                        'Set SHOW_HIDDEN_GAMES = True in config.local.py to include them.'
                    ),
                }
            else:
                yield {'type': 'error', 'message': 'No games to display after applying filters.'}
            return

        cache = LibraryCache(steam_id)
        if CACHE_ENABLED:
            cache.load()
            cache.sync_library_appids(game['appid'] for game in steam_games)
            cache.mark_library_fetched()

        total = len(steam_games)
        app_ids = [game['appid'] for game in steam_games]
        cached_hltb = cache.count_cached_hltb(app_ids, HLTB_CACHE_MAX_AGE_DAYS) if CACHE_ENABLED else 0

        yield {
            'type': 'meta',
            'steamId': str(steam_id),
            'libraryFetchedAt': cache._data.get('library_fetched_at') if CACHE_ENABLED else None,
            'total': total,
            'totalGames': total,
            'cached_hltb': cached_hltb,
            'cachedHltb': cached_hltb,
            'pending_hltb': total - cached_hltb,
            'pendingHltb': total - cached_hltb,
            'syncComplete': cached_hltb == total,
            **public_hidden_meta(hidden_meta),
        }

        hltb = HowLongToBeat()
        for index, steam_game in enumerate(steam_games, start=1):
            if CACHE_ENABLED:
                cache.update_steam_fields(steam_game)

            from_cache = (
                CACHE_ENABLED
                and cache.has_hltb(steam_game['appid'], HLTB_CACHE_MAX_AGE_DAYS)
            )

            if from_cache:
                hltb_data = cache.get_game(steam_game['appid']).get('hltb')
            else:
                hltb_data = None
                results = hltb.search(steam_game['name'])
                if results:
                    result = max(results, key=lambda element: element.similarity)
                    hltb_data = hltb_result_to_cache(result)

                if CACHE_ENABLED:
                    cache.set_hltb(steam_game['appid'], hltb_data)

            if CACHE_ENABLED:
                cache.save()

            ensure_image(steam_game['appid'])
            cached_entry = cache.get_game(steam_game['appid']) if CACHE_ENABLED else None
            game = steam_game_to_game(steam_game, cached_entry)

            yield {
                'type': 'game',
                'index': index,
                'from_cache': from_cache,
                'fromCache': from_cache,
                'game': game,
            }

        yield {
            'type': 'done',
            'cached_hltb': cached_hltb,
            'cachedHltb': cached_hltb,
            'syncComplete': True,
        }

    @staticmethod
    def iter_sync_reviews(steam_id, show_hidden=None):
        from .store_metadata import fetch_steam_reviews

        if not FETCH_STEAM_REVIEWS:
            yield {'type': 'error', 'message': 'Steam review fetching is disabled in config.'}
            return

        api_handler = SteamApiHandler()
        steam_games = api_handler.get_owned_games(steam_id)

        if steam_games is None:
            yield {'type': 'error', 'message': 'Steam API key is not configured. Add STEAM_API_KEY to config.local.py.'}
            return

        if not steam_games:
            yield {'type': 'error', 'message': 'No games returned. Check your Steam ID and that your game library is public.'}
            return

        steam_games, hidden_meta = filter_hidden_games(steam_games, steam_id, show_hidden=show_hidden)
        if not steam_games:
            yield {'type': 'error', 'message': 'No games to display after applying filters.'}
            return

        cache = LibraryCache(steam_id)
        if CACHE_ENABLED:
            cache.load()

        total = len(steam_games)
        app_ids = [game['appid'] for game in steam_games]
        cached_reviews = cache.count_cached_steam_reviews(app_ids) if CACHE_ENABLED else 0

        yield {
            'type': 'meta',
            'steamId': str(steam_id),
            'total': total,
            'totalGames': total,
            'cachedReviews': cached_reviews,
            'pendingReviews': total - cached_reviews,
            'reviewsComplete': cached_reviews == total,
            **public_hidden_meta(hidden_meta),
        }

        for index, steam_game in enumerate(steam_games, start=1):
            app_id = steam_game['appid']
            from_cache = CACHE_ENABLED and cache.has_steam_reviews(app_id)

            if from_cache:
                reviews_data = cache.get_game(app_id).get('steam_reviews')
            else:
                reviews_data = fetch_steam_reviews(app_id)
                if CACHE_ENABLED:
                    cache.set_steam_reviews(app_id, reviews_data)
                    cache.save()

            if CACHE_ENABLED:
                cache.update_steam_fields(steam_game)

            cached_entry = cache.get_game(app_id) if CACHE_ENABLED else None
            game = steam_game_to_game(steam_game, cached_entry)

            yield {
                'type': 'game',
                'index': index,
                'fromCache': from_cache,
                'game': game,
            }

        yield {
            'type': 'done',
            'cachedReviews': total,
            'reviewsComplete': True,
        }

    @staticmethod
    def fetch_store_for_game(steam_id, app_id):
        from .store_metadata import fetch_steam_reviews, fetch_store_metadata

        cache = LibraryCache(steam_id)
        cache.load()
        store_data = fetch_store_metadata(app_id)
        if not store_data:
            return None

        entry = cache._data['games'].setdefault(str(app_id), {'appid': app_id})
        entry['store'] = {
            'short_description': store_data.get('short_description'),
            'genres': store_data.get('genres') or [],
            'developers': store_data.get('developers') or [],
            'release_date': store_data.get('release_date'),
            'release_timestamp': store_data.get('release_timestamp'),
            'early_access': store_data.get('early_access'),
        }
        entry['store_fetched_at'] = store_data.get('fetched_at')

        if CACHE_ENABLED and not cache.has_steam_reviews(app_id):
            reviews_data = fetch_steam_reviews(app_id)
            cache.set_steam_reviews(app_id, reviews_data)

        cache.save()

        cached_entry = cache.get_game(app_id)
        return cache_entry_to_game(cached_entry) if cached_entry else None
