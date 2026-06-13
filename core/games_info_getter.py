from datetime import datetime, timezone

from howlongtobeatpy import HowLongToBeat

from config import CACHE_ENABLED, HLTB_CACHE_MAX_AGE_DAYS
from .cache_store import LibraryCache
from .steam_api_handler import SteamApiHandler
from .steam_hidden_games import filter_hidden_games


def format_playtime(minutes):
    if not minutes:
        return '0 hrs'

    hours = minutes // 60
    mins = minutes % 60

    if hours == 0:
        return f'{mins} mins'
    if mins == 0:
        return f'{hours} hrs'
    return f'{hours} hrs {mins} mins'


def format_last_played(timestamp):
    if not timestamp:
        return '—'

    return datetime.fromtimestamp(timestamp, tz=timezone.utc).strftime('%d %b %Y')


def build_game_info(steam_game, hltb_data=None):
    appid = steam_game['appid']
    game_info = {
        'AppId': appid,
        'ImageUrl': f'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/{appid}/header.jpg',
        'GameName': steam_game['name'],
        'GameType': '—',
        'MainStory': '—',
        'MainExtra': '—',
        'Completionist': '—',
        'PlaytimeMinutes': steam_game.get('playtime_forever', 0),
        'Playtime': format_playtime(steam_game.get('playtime_forever', 0)),
        'LastPlayedTimestamp': steam_game.get('rtime_last_played') or 0,
        'LastPlayed': format_last_played(steam_game.get('rtime_last_played')),
    }

    if hltb_data:
        game_info.update({
            'GameName': hltb_data.get('game_name') or steam_game['name'],
            'GameType': hltb_data.get('game_type') or '—',
            'MainStory': hltb_data.get('main_story') if hltb_data.get('main_story') else '—',
            'MainExtra': hltb_data.get('main_extra') if hltb_data.get('main_extra') else '—',
            'Completionist': hltb_data.get('completionist') if hltb_data.get('completionist') else '—',
        })

    return game_info


def hltb_result_to_cache(result):
    return {
        'game_name': result.game_name,
        'game_type': result.game_type,
        'main_story': result.main_story,
        'main_extra': result.main_extra,
        'completionist': result.completionist,
    }


class GamesInfoGetter:
    @staticmethod
    def iter_games_info(user_id):
        api_handler = SteamApiHandler()
        steam_games = api_handler.get_owned_games(user_id)

        if steam_games is None:
            yield {
                'type': 'error',
                'message': 'Steam API key is not configured. Add STEAM_API_KEY to config.local.py.',
            }
            return

        if not steam_games:
            yield {
                'type': 'error',
                'message': 'No games returned. Check your Steam ID and that your game library is public.',
            }
            return

        steam_games, hidden_meta = filter_hidden_games(steam_games, user_id)

        if not steam_games:
            if hidden_meta['hidden_filtered'] > 0:
                yield {
                    'type': 'error',
                    'message': (
                        'All returned games are marked hidden in your Steam client. '
                        'Set SHOW_HIDDEN_GAMES = True in config.local.py to include them.'
                    ),
                }
            else:
                yield {
                    'type': 'error',
                    'message': 'No games to display after applying filters.',
                }
            return

        cache = LibraryCache(user_id)
        if CACHE_ENABLED:
            cache.load()
            cache.sync_library_appids(game['appid'] for game in steam_games)
            cache.mark_library_fetched()

        total = len(steam_games)
        appids = [game['appid'] for game in steam_games]
        cached_hltb = cache.count_cached_hltb(appids, HLTB_CACHE_MAX_AGE_DAYS) if CACHE_ENABLED else 0

        yield {
            'type': 'meta',
            'total': total,
            'cached_hltb': cached_hltb,
            'pending_hltb': total - cached_hltb,
            **hidden_meta,
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
                cached_entry = cache.get_game(steam_game['appid'])
                hltb_data = cached_entry.get('hltb')
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

            yield {
                'type': 'game',
                'index': index,
                'from_cache': from_cache,
                'game': build_game_info(steam_game, hltb_data),
            }

        yield {'type': 'done', 'cached_hltb': cached_hltb}
