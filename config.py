import importlib.util
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
LOCAL_CONFIG_PATH = PROJECT_ROOT / 'config.local.py'

DEFAULTS = {
    'STEAM_API_KEY': '',
    'STEAM_ID': '',
    'HOST': '127.0.0.1',
    'PORT': 5000,
    'DEBUG': True,
    'CACHE_ENABLED': True,
    'CACHE_DIR': 'data/cache',
    'HLTB_CACHE_MAX_AGE_DAYS': 0,
    'CHECK_FOR_HIDDEN_GAMES': True,
    'SHOW_HIDDEN_GAMES': False,
    'STEAM_INSTALL_PATH': '',
}


def _load_local_config():
    if not LOCAL_CONFIG_PATH.exists():
        print('Missing config.local.py')
        print('Copy the example file and add your settings:')
        print('  copy config.local.example.py config.local.py')
        sys.exit(1)

    spec = importlib.util.spec_from_file_location('config_local', LOCAL_CONFIG_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


_local = _load_local_config()

STEAM_API_KEY = getattr(_local, 'STEAM_API_KEY', DEFAULTS['STEAM_API_KEY'])
STEAM_ID = getattr(_local, 'STEAM_ID', DEFAULTS['STEAM_ID'])
HOST = getattr(_local, 'HOST', DEFAULTS['HOST'])
PORT = getattr(_local, 'PORT', DEFAULTS['PORT'])
DEBUG = getattr(_local, 'DEBUG', DEFAULTS['DEBUG'])
CACHE_ENABLED = getattr(_local, 'CACHE_ENABLED', DEFAULTS['CACHE_ENABLED'])
CACHE_DIR = getattr(_local, 'CACHE_DIR', DEFAULTS['CACHE_DIR'])
HLTB_CACHE_MAX_AGE_DAYS = getattr(_local, 'HLTB_CACHE_MAX_AGE_DAYS', DEFAULTS['HLTB_CACHE_MAX_AGE_DAYS'])
CHECK_FOR_HIDDEN_GAMES = getattr(_local, 'CHECK_FOR_HIDDEN_GAMES', DEFAULTS['CHECK_FOR_HIDDEN_GAMES'])
SHOW_HIDDEN_GAMES = getattr(_local, 'SHOW_HIDDEN_GAMES', DEFAULTS['SHOW_HIDDEN_GAMES'])
STEAM_INSTALL_PATH = getattr(_local, 'STEAM_INSTALL_PATH', DEFAULTS['STEAM_INSTALL_PATH'])


def get_cache_dir():
    cache_path = Path(CACHE_DIR)
    if not cache_path.is_absolute():
        cache_path = PROJECT_ROOT / cache_path
    return cache_path
