import json
import os
import re
import sys
from pathlib import Path

from config import CHECK_FOR_HIDDEN_GAMES, SHOW_HIDDEN_GAMES, STEAM_INSTALL_PATH

STEAM_ID64_BASE = 76561197960265728
USER_COLLECTIONS_PATTERN = re.compile(
    r'"user-collections"\s+"((?:\\.|[^"\\])*)"',
    re.DOTALL,
)


def steam_id_to_account_id(steam_id_64):
    return int(steam_id_64) - STEAM_ID64_BASE


def normalize_hidden_appid(appid):
    appid = int(appid)
    if appid >= 2 ** 32:
        appid -= 2 ** 32
    return appid


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
    install_path = Path(STEAM_INSTALL_PATH) if STEAM_INSTALL_PATH else detect_steam_install_path()
    if not install_path:
        return None

    account_id = steam_id_to_account_id(steam_id_64)
    localconfig_path = install_path / 'userdata' / str(account_id) / 'config' / 'localconfig.vdf'
    if localconfig_path.is_file():
        return localconfig_path

    return None


def _decode_vdf_escaped_string(raw_value):
    return bytes(raw_value, 'utf-8').decode('unicode_escape')


def _parse_user_collections_json(content):
    match = USER_COLLECTIONS_PATTERN.search(content)
    if not match:
        return None

    raw_value = _decode_vdf_escaped_string(match.group(1))
    return json.loads(raw_value)


def get_hidden_appids(steam_id_64):
    localconfig_path = get_localconfig_path(steam_id_64)
    if not localconfig_path:
        return set(), 'unavailable'

    try:
        content = localconfig_path.read_text(encoding='utf-8', errors='replace')
        collections = _parse_user_collections_json(content)
    except (OSError, json.JSONDecodeError, ValueError):
        return set(), 'unavailable'

    if not collections:
        return set(), 'empty'

    hidden = collections.get('hidden', {})
    hidden_appids = {normalize_hidden_appid(appid) for appid in hidden.get('added', [])}
    hidden_appids -= {normalize_hidden_appid(appid) for appid in hidden.get('removed', [])}
    return hidden_appids, 'ok'


def filter_hidden_games(steam_games, steam_id_64):
    library_total = len(steam_games)

    if not CHECK_FOR_HIDDEN_GAMES:
        return list(steam_games), {
            'library_total': library_total,
            'hidden_in_library': 0,
            'hidden_filtered': 0,
            'hidden_detection': 'disabled',
            'check_hidden_games': False,
            'show_hidden_games': SHOW_HIDDEN_GAMES,
        }

    hidden_appids, detection = get_hidden_appids(steam_id_64)
    hidden_in_library = sum(1 for game in steam_games if game['appid'] in hidden_appids)

    if SHOW_HIDDEN_GAMES:
        visible_games = list(steam_games)
        hidden_filtered = 0
    else:
        visible_games = [
            game for game in steam_games
            if game['appid'] not in hidden_appids
        ]
        hidden_filtered = hidden_in_library

    return visible_games, {
        'library_total': library_total,
        'hidden_in_library': hidden_in_library,
        'hidden_filtered': hidden_filtered,
        'hidden_detection': detection,
        'check_hidden_games': True,
        'show_hidden_games': SHOW_HIDDEN_GAMES,
    }
