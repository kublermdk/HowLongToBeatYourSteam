from datetime import datetime


GAME_TYPE_LABELS = {
    'game': 'Game',
    'multi': 'Multiplayer',
    'dlc': 'DLC',
    'compilation': 'Compilation',
    'sports': 'Sports',
    'endless': 'Endless',
    'demo': 'Demo',
    'mod': 'Mod',
    'hardware': 'Hardware',
    'music': 'Music',
    'series': 'Series',
}


def game_type_label(raw_type):
    if not raw_type:
        return None
    return GAME_TYPE_LABELS.get(raw_type.lower(), raw_type.title())


def steam_store_url(app_id):
    return f'https://store.steampowered.com/app/{app_id}'


def hltb_url(hltb_data):
    if not hltb_data:
        return None
    if hltb_data.get('game_web_link'):
        return hltb_data['game_web_link']
    hltb_id = hltb_data.get('game_id')
    if hltb_id:
        return f'https://howlongtobeat.com/game/{hltb_id}'
    return None


def hltb_result_to_cache(result):
    return {
        'game_id': result.game_id,
        'game_name': result.game_name,
        'game_alias': result.game_alias,
        'game_type': result.game_type,
        'game_web_link': result.game_web_link,
        'game_image_url': result.game_image_url,
        'main_story': result.main_story,
        'main_extra': result.main_extra,
        'completionist': result.completionist,
        'all_styles': result.all_styles,
        'coop_time': result.coop_time,
        'mp_time': result.mp_time,
        'review_score': result.review_score,
        'release_world': result.release_world,
        'profile_platforms': result.profile_platforms or [],
        'similarity': result.similarity,
    }


def build_hltb_api(hltb_data):
    if not hltb_data:
        return None

    raw_type = hltb_data.get('game_type')
    return {
        'mainStoryHours': hltb_data.get('main_story'),
        'mainExtraHours': hltb_data.get('main_extra'),
        'completionistHours': hltb_data.get('completionist'),
        'allStylesHours': hltb_data.get('all_styles'),
        'coopHours': hltb_data.get('coop_time'),
        'multiplayerHours': hltb_data.get('mp_time'),
        'gameType': raw_type,
        'gameTypeLabel': game_type_label(raw_type),
        'reviewScore': hltb_data.get('review_score'),
        'releaseYear': hltb_data.get('release_world'),
        'platforms': hltb_data.get('profile_platforms') or [],
        'matchSimilarity': hltb_data.get('similarity'),
        'gameAlias': hltb_data.get('game_alias'),
    }


def build_steam_reviews_api(reviews_data):
    if not reviews_data:
        return None

    label = reviews_data.get('review_score_desc')
    if not label:
        return None

    total = reviews_data.get('total_reviews') or 0
    positive = reviews_data.get('total_positive') or 0
    negative = reviews_data.get('total_negative') or 0

    return {
        'score': reviews_data.get('review_score'),
        'scoreLabel': label,
        'totalReviews': total,
        'totalPositive': positive,
        'totalNegative': negative,
        'positivePercent': round((positive / total) * 100, 1) if total else None,
    }


def build_store_api(store_data):
    if not store_data:
        return None

    return {
        'shortDescription': store_data.get('short_description'),
        'genres': store_data.get('genres') or [],
        'developers': store_data.get('developers') or [],
        'releaseDate': store_data.get('release_date'),
        'releaseTimestamp': store_data.get('release_timestamp'),
        'earlyAccess': bool(store_data.get('early_access')),
    }


def build_release_api(hltb_data, store_data):
    early_access = False
    timestamp = None
    year = None
    month = None
    label = None
    source = None

    if store_data:
        early_access = bool(store_data.get('early_access'))
        timestamp = store_data.get('release_timestamp')
        label = store_data.get('release_date')
        if timestamp:
            release_dt = datetime.utcfromtimestamp(timestamp)
            year = release_dt.year
            month = release_dt.month
            source = 'steam'
        elif label and label.isdigit():
            year = int(label)
            month = 1
            timestamp = int(datetime(year, 1, 1).timestamp())
            source = 'steam'

    if timestamp is None and hltb_data:
        hltb_year = hltb_data.get('release_world')
        if isinstance(hltb_year, int) and hltb_year > 0:
            year = hltb_year
            month = 7
            timestamp = int(datetime(hltb_year, 7, 1).timestamp())
            label = str(hltb_year)
            source = 'hltb'

    if timestamp is None and not early_access:
        return None

    return {
        'year': year,
        'month': month,
        'timestamp': timestamp,
        'label': label,
        'earlyAccess': early_access,
        'source': source,
    }


def cache_entry_to_game(entry):
    app_id = entry['appid']
    hltb_data = entry.get('hltb')
    store_data = entry.get('store')

    return {
        'appId': app_id,
        'steamName': entry.get('steam_name', 'Unknown Game'),
        'hltbName': hltb_data.get('game_name') if hltb_data else None,
        'hltbId': hltb_data.get('game_id') if hltb_data else None,
        'links': {
            'steamStore': steam_store_url(app_id),
            'howLongToBeat': hltb_url(hltb_data),
        },
        'playtimeMinutes': entry.get('playtime_forever') or 0,
        'playtime2WeeksMinutes': entry.get('playtime_2weeks') or 0,
        'lastPlayedTimestamp': entry.get('rtime_last_played') or 0,
        'cached': {
            'steamFetchedAt': entry.get('steam_fetched_at'),
            'hltbFetchedAt': entry.get('hltb_fetched_at'),
            'storeFetchedAt': entry.get('store_fetched_at'),
        },
        'hltb': build_hltb_api(hltb_data),
        'store': build_store_api(store_data),
        'release': build_release_api(hltb_data, store_data),
        'steamReviews': build_steam_reviews_api(entry.get('steam_reviews')),
        'images': {
            'headerUrl': f'/api/images/{app_id}',
            'hltbImageUrl': hltb_data.get('game_image_url') if hltb_data else None,
        },
    }


def steam_game_to_game(steam_game, cache_entry=None):
    entry = {
        'appid': steam_game['appid'],
        'steam_name': steam_game['name'],
        'playtime_forever': steam_game.get('playtime_forever', 0),
        'playtime_2weeks': steam_game.get('playtime_2weeks', 0),
        'rtime_last_played': steam_game.get('rtime_last_played') or 0,
    }

    if cache_entry:
        entry.update(cache_entry)
        entry['appid'] = steam_game['appid']
        entry['steam_name'] = steam_game['name']
        entry['playtime_forever'] = steam_game.get('playtime_forever', 0)
        entry['playtime_2weeks'] = steam_game.get('playtime_2weeks', 0)
        entry['rtime_last_played'] = steam_game.get('rtime_last_played') or 0

    return cache_entry_to_game(entry)
