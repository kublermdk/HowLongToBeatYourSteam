import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core.steam_api_handler import SteamApiHandler
from core.steam_hidden_games import filter_hidden_games, get_hidden_appids, get_hidden_debug

STEAM_ID = '76561197960971312'

appids, status, source_debug = get_hidden_appids(STEAM_ID)
print('=== get_hidden_appids ===')
print('status:', status)
print('count:', len(appids))
print('sample:', sorted(appids)[:20])
print('source debug:')
for key, value in source_debug.items():
    print(f'  {key}: {value}')

print('\n=== filter_hidden_games ===')
steam_games = SteamApiHandler().get_owned_games(STEAM_ID) or []
visible, meta = filter_hidden_games(steam_games, STEAM_ID)
print('steam api games:', len(steam_games))
print('visible games:', len(visible))
print('hidden filtered:', meta.get('hidden_filtered'))
debug = meta.get('hidden_debug', {})
print('action:', debug.get('actionMessage'))
print('filtered sample:', debug.get('filteredGamesSample'))

print('\n=== get_hidden_debug ===')
print(get_hidden_debug(STEAM_ID))
