# -- Local configuration for HowLongToBeatYourSteam
# --
# -- Copy this file to config.local.py and edit your values:
# --
# --   copy config.local.example.py config.local.py
# --
# -- config.local.py is not tracked by git.

# -- Required: get a key at https://steamcommunity.com/dev/apikey
STEAM_API_KEY = ''

# -- Optional: your SteamID64, so the home page pre-fills it (e.g. 76561197960971312)
STEAM_ID = ''

# -- Web server
HOST = '127.0.0.1'
PORT = 5000
DEBUG = True

# -- Local cache (stored on disk under CACHE_DIR)
CACHE_ENABLED = True
CACHE_DIR = 'data/cache'

# -- HowLongToBeat cache lifetime in days.
# -- 0 = keep cached HLTB data until you manually refresh (default).
# -- e.g. 30 = re-fetch HLTB data older than 30 days.
HLTB_CACHE_MAX_AGE_DAYS = 0

# -- Steam client hidden games (View > Hidden games in the Steam library).
# -- Hidden status is read from your local Steam install, not the Web API.
CHECK_FOR_HIDDEN_GAMES = True

# -- Only applies when CHECK_FOR_HIDDEN_GAMES is True.
# -- False = exclude hidden games from results (default).
# -- True = include hidden games in results.
SHOW_HIDDEN_GAMES = False

# -- Path to your Steam installation folder, e.g. C:/Program Files (x86)/Steam
# -- Leave empty to auto-detect on Windows, Linux, and macOS.
STEAM_INSTALL_PATH = ''
