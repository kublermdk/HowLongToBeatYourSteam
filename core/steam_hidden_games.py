import json
import logging
import os
import re
import sys
from pathlib import Path

from config import CHECK_FOR_HIDDEN_GAMES, DEBUG, SHOW_HIDDEN_GAMES, STEAM_INSTALL_PATH

logger = logging.getLogger(__name__)

STEAM_ID64_BASE = 76561197960265728
USER_COLLECTIONS_PATTERN = re.compile(
    r'"user-collections"\s+"((?:\\.|[^"\\])*)"',
    re.DOTALL,
)
CLOUD_NAMESPACE_FILES = (
    'cloud-storage-namespace-1.modified.json',
    'cloud-storage-namespace-1.json',
)


def steam_id_to_account_id(steam_id_64):
    return int(steam_id_64) - STEAM_ID64_BASE


def normalize_hidden_appid(appid):
    appid = int(appid)
    if appid >= 2 ** 32:
        appid -= 2 ** 32
    return appid


def resolve_steam_install_path():
    if STEAM_INSTALL_PATH:
        return Path(STEAM_INSTALL_PATH)
    return detect_steam_install_path()


def detect_steam_install_path():
    candidates = []

    if sys.platform == 'win32':
        for env_name in ('ProgramFiles(x86)', 'ProgramFiles'):
            base = os.environ.get(env_name)
            if base:
                candidates.append(Path(base) / 'Steam')
    elif sys.platform == 'darwin':
        candidates.append(Path.home() / 'Library/Application Support/Steam')
    else:
        candidates.extend([
            Path.home() / '.local/share/Steam',
            Path.home() / '.steam/steam',
        ])

    for path in candidates:
        if (path / 'userdata').is_dir():
            return path

    return None


def get_localconfig_path(steam_id_64):
    install_path = resolve_steam_install_path()
    if not install_path:
        return None

    account_id = steam_id_to_account_id(steam_id_64)
    localconfig_path = install_path / 'userdata' / str(account_id) / 'config' / 'localconfig.vdf'
    if localconfig_path.is_file():
        return localconfig_path

    return None


def get_cloud_storage_dir(steam_id_64):
    install_path = resolve_steam_install_path()
    if not install_path:
        return None

    account_id = steam_id_to_account_id(steam_id_64)
    cloud_dir = install_path / 'userdata' / str(account_id) / 'config' / 'cloudstorage'
    if cloud_dir.is_dir():
        return cloud_dir

    return None


def _decode_vdf_escaped_string(raw_value):
    return bytes(raw_value, 'utf-8').decode('unicode_escape')


def _hidden_appids_from_collection(collection):
    if not collection or not isinstance(collection, dict):
        return set()

    hidden = collection.get('hidden', collection)
    if not isinstance(hidden, dict):
        return set()

    hidden_appids = {normalize_hidden_appid(appid) for appid in hidden.get('added', [])}
    hidden_appids -= {normalize_hidden_appid(appid) for appid in hidden.get('removed', [])}
    return hidden_appids


def _parse_user_collections_json(content):
    match = USER_COLLECTIONS_PATTERN.search(content)
    if not match:
        return None, 'user-collections key not found in localconfig.vdf'

    raw_value = _decode_vdf_escaped_string(match.group(1))
    if raw_value.strip() in ('', '{}'):
        return None, 'user-collections in localconfig.vdf is empty (Steam may store hidden games in cloud storage instead)'

    return json.loads(raw_value), None


def _parse_hidden_from_cloud_file(path):
    payload = json.loads(path.read_text(encoding='utf-8'))
    if not isinstance(payload, list):
        return None, 'cloud storage file is not a list'

    for entry in payload:
        if not isinstance(entry, list) or len(entry) != 2:
            continue

        key, record = entry
        if key != 'user-collections.hidden':
            continue

        if not isinstance(record, dict) or not record.get('value'):
            return None, 'user-collections.hidden entry has no value'

        collection = json.loads(record['value'])
        return collection, None

    return None, 'user-collections.hidden key not found in cloud storage file'


def get_hidden_appids(steam_id_64):
    debug = {
        'steamInstallPath': None,
        'localconfigPath': None,
        'cloudStorageDir': None,
        'cloudStorageFile': None,
        'accountId': steam_id_to_account_id(int(steam_id_64)),
        'detectionSource': None,
        'localconfigMessage': None,
        'cloudStorageMessage': None,
        'hiddenAddedCount': 0,
        'hiddenRemovedCount': 0,
        'parseError': None,
    }

    install_path = resolve_steam_install_path()
    debug['steamInstallPath'] = str(install_path) if install_path else None

    if not install_path:
        return set(), 'unavailable', {
            **debug,
            'message': 'Steam install path not found. Set STEAM_INSTALL_PATH in config.local.py.',
        }

    localconfig_path = get_localconfig_path(steam_id_64)
    debug['localconfigPath'] = str(localconfig_path) if localconfig_path else None

    if localconfig_path:
        try:
            content = localconfig_path.read_text(encoding='utf-8', errors='replace')
            collections, localconfig_message = _parse_user_collections_json(content)
            debug['localconfigMessage'] = localconfig_message

            if collections:
                hidden_appids = _hidden_appids_from_collection(collections)
                if hidden_appids:
                    hidden = collections.get('hidden', {})
                    debug.update({
                        'detectionSource': 'localconfig',
                        'hiddenAddedCount': len(hidden.get('added', [])),
                        'hiddenRemovedCount': len(hidden.get('removed', [])),
                        'message': f'Loaded {len(hidden_appids)} hidden app IDs from localconfig.vdf.',
                    })
                    return hidden_appids, 'ok', debug
        except (OSError, json.JSONDecodeError, ValueError) as error:
            debug['localconfigMessage'] = f'Failed to parse localconfig.vdf: {error}'
            debug['parseError'] = str(error)

    cloud_dir = get_cloud_storage_dir(steam_id_64)
    debug['cloudStorageDir'] = str(cloud_dir) if cloud_dir else None

    if cloud_dir:
        checked_files = []
        last_cloud_message = None
        for filename in CLOUD_NAMESPACE_FILES:
            cloud_path = cloud_dir / filename
            checked_files.append(str(cloud_path))
            if not cloud_path.is_file():
                last_cloud_message = f'{cloud_path.name} not found'
                continue

            try:
                collection, cloud_message = _parse_hidden_from_cloud_file(cloud_path)
                if cloud_message:
                    last_cloud_message = cloud_message
                    continue

                hidden_appids = _hidden_appids_from_collection(collection)
                debug['cloudStorageFile'] = str(cloud_path)
                debug['cloudStorageMessage'] = None
                debug['hiddenAddedCount'] = len(collection.get('added', []))
                debug['hiddenRemovedCount'] = len(collection.get('removed', []))

                if hidden_appids:
                    debug.update({
                        'detectionSource': 'cloud_storage',
                        'message': (
                            f'Loaded {len(hidden_appids)} hidden app IDs from '
                            f'{cloud_path.name} (Steam cloud storage).'
                        ),
                    })
                    return hidden_appids, 'ok', debug

                last_cloud_message = f'{cloud_path.name} hidden collection is empty'
            except (OSError, json.JSONDecodeError, ValueError) as error:
                last_cloud_message = f'Failed to parse {cloud_path.name}: {error}'
                debug['parseError'] = str(error)

        debug['cloudStorageMessage'] = last_cloud_message or (
            'No cloud storage files found: ' + ', '.join(checked_files)
        )

    message_parts = []
    if debug.get('localconfigMessage'):
        message_parts.append(debug['localconfigMessage'])
    if debug.get('cloudStorageMessage'):
        message_parts.append(debug['cloudStorageMessage'])

    return set(), 'empty', {
        **debug,
        'message': ' '.join(message_parts) or 'No hidden games found in local Steam config.',
    }


def filter_hidden_games(steam_games, steam_id_64, show_hidden=None):
    library_total = len(steam_games)
    include_hidden = SHOW_HIDDEN_GAMES if show_hidden is None else show_hidden

    if not CHECK_FOR_HIDDEN_GAMES:
        debug = {
            'checkHiddenGames': False,
            'showHiddenGames': include_hidden,
            'detection': 'disabled',
            'message': 'Hidden game filtering is disabled (CHECK_FOR_HIDDEN_GAMES = False).',
        }
        return list(steam_games), {
            'library_total': library_total,
            'hidden_in_library': 0,
            'hidden_filtered': 0,
            'hidden_detection': 'disabled',
            'check_hidden_games': False,
            'show_hidden_games': include_hidden,
            'hidden_debug': debug,
        }

    hidden_appids, detection, source_debug = get_hidden_appids(steam_id_64)
    matched_games = [
        {'appId': game['appid'], 'name': game['name']}
        for game in steam_games
        if game['appid'] in hidden_appids
    ]
    hidden_in_library = len(matched_games)

    if include_hidden:
        visible_games = list(steam_games)
        hidden_filtered = 0
        action_message = 'SHOW_HIDDEN_GAMES is True, so hidden games are included in results.'
    else:
        visible_games = [
            game for game in steam_games
            if game['appid'] not in hidden_appids
        ]
        hidden_filtered = hidden_in_library
        action_message = (
            f'Excluded {hidden_filtered} hidden game(s) from {library_total} Steam API games.'
            if hidden_filtered
            else 'No hidden games matched the current Steam API library list.'
        )

    hidden_debug = {
        'checkHiddenGames': True,
        'showHiddenGames': include_hidden,
        'detection': detection,
        'detectionSource': source_debug.get('detectionSource'),
        'steamInstallPath': source_debug.get('steamInstallPath'),
        'localconfigPath': source_debug.get('localconfigPath'),
        'cloudStorageDir': source_debug.get('cloudStorageDir'),
        'cloudStorageFile': source_debug.get('cloudStorageFile'),
        'accountId': source_debug.get('accountId'),
        'localconfigMessage': source_debug.get('localconfigMessage'),
        'cloudStorageMessage': source_debug.get('cloudStorageMessage'),
        'hiddenAppidsInConfig': len(hidden_appids),
        'hiddenAddedCount': source_debug.get('hiddenAddedCount', 0),
        'hiddenRemovedCount': source_debug.get('hiddenRemovedCount', 0),
        'hiddenInLibrary': hidden_in_library,
        'hiddenFiltered': hidden_filtered,
        'libraryTotal': library_total,
        'visibleTotal': len(visible_games),
        'hiddenAppidsSample': sorted(hidden_appids)[:20],
        'filteredGamesSample': matched_games[:20],
        'parseError': source_debug.get('parseError'),
        'message': source_debug.get('message'),
        'actionMessage': action_message,
    }

    if DEBUG:
        logger.info('Hidden games debug: %s', hidden_debug)

    return visible_games, {
        'library_total': library_total,
        'hidden_in_library': hidden_in_library,
        'hidden_filtered': hidden_filtered,
        'hidden_detection': detection,
        'check_hidden_games': True,
        'show_hidden_games': include_hidden,
        'hidden_debug': hidden_debug,
    }


def public_hidden_meta(hidden_meta):
    return {
        'hiddenFiltered': hidden_meta.get('hidden_filtered', 0),
        'hiddenInLibrary': hidden_meta.get('hidden_in_library', 0),
        'hiddenDetection': hidden_meta.get('hidden_detection'),
        'hiddenDebug': hidden_meta.get('hidden_debug'),
        'showHiddenGames': hidden_meta.get('hidden_debug', {}).get('showHiddenGames'),
    }


def get_hidden_debug(steam_id_64):
    from .steam_api_handler import SteamApiHandler

    if not CHECK_FOR_HIDDEN_GAMES:
        return {
            'checkHiddenGames': False,
            'showHiddenGames': include_hidden,
            'detection': 'disabled',
            'message': 'Hidden game filtering is disabled (CHECK_FOR_HIDDEN_GAMES = False).',
        }

    api_handler = SteamApiHandler()
    steam_games = api_handler.get_owned_games(steam_id_64) or []
    _, hidden_meta = filter_hidden_games(steam_games, steam_id_64)
    return hidden_meta.get('hidden_debug', {})
