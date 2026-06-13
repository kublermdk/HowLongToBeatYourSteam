import requests

from config import STEAM_API_KEY


class SteamApiHandler:
    def __init__(self):
        self.api_key = STEAM_API_KEY

    def get_owned_games(self, user_id):
        if not self.api_key:
            print('Error: No Steam API key configured.')
            print('Add STEAM_API_KEY to config.local.py')
            print('Get one at https://steamcommunity.com/dev/apikey')
            return None

        endpoint = (
            'https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/'
            f'?key={self.api_key}&steamid={user_id}&include_appinfo=1'
            '&include_played_free_games=1&format=json'
        )

        response = requests.get(endpoint)

        if response.status_code != 200:
            print(f'Error: {response.status_code}')
            print(response.text)
            return None

        games = response.json().get('response', {}).get('games', [])
        if not games:
            print('No games returned. Check that your Steam profile and game library are public.')
            return []

        return [
            {
                'appid': game['appid'],
                'name': game.get('name', 'Unknown Game'),
                'playtime_forever': game.get('playtime_forever', 0),
                'playtime_2weeks': game.get('playtime_2weeks', 0),
                'rtime_last_played': game.get('rtime_last_played'),
            }
            for game in games
            if game.get('name')
        ]
