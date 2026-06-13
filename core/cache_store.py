import json
import time
from pathlib import Path

from config import CACHE_ENABLED, get_cache_dir


class LibraryCache:
    def __init__(self, steam_id):
        self.steam_id = str(steam_id)
        self.cache_dir = get_cache_dir()
        self.path = self.cache_dir / f'{self.steam_id}.json'
        self._data = {
            'steam_id': self.steam_id,
            'library_fetched_at': None,
            'games': {},
        }

    def load(self):
        if not self.path.exists():
            return self

        with self.path.open(encoding='utf-8') as cache_file:
            self._data = json.load(cache_file)

        self._data.setdefault('games', {})
        return self

    def save(self):
        if not CACHE_ENABLED:
            return

        self.cache_dir.mkdir(parents=True, exist_ok=True)
        with self.path.open('w', encoding='utf-8') as cache_file:
            json.dump(self._data, cache_file, indent=2)

    def is_hltb_fresh(self, appid, max_age_days):
        entry = self._data['games'].get(str(appid))
        if not entry or not entry.get('hltb_fetched_at'):
            return False

        if max_age_days <= 0:
            return True

        max_age_seconds = max_age_days * 86400
        return (time.time() - entry['hltb_fetched_at']) < max_age_seconds

    def has_hltb(self, appid, max_age_days=0):
        entry = self._data['games'].get(str(appid))
        if entry is None or entry.get('hltb_fetched_at') is None:
            return False

        return self.is_hltb_fresh(appid, max_age_days)

    def sync_library_appids(self, appids):
        current_appids = {str(appid) for appid in appids}
        self._data['games'] = {
            appid: entry
            for appid, entry in self._data['games'].items()
            if appid in current_appids
        }

    def mark_library_fetched(self):
        self._data['library_fetched_at'] = int(time.time())

    def get_game(self, appid):
        return self._data['games'].get(str(appid))

    def update_steam_fields(self, steam_game):
        appid = str(steam_game['appid'])
        entry = self._data['games'].setdefault(appid, {'appid': steam_game['appid']})
        now = int(time.time())

        entry.update({
            'steam_name': steam_game['name'],
            'playtime_forever': steam_game.get('playtime_forever', 0),
            'playtime_2weeks': steam_game.get('playtime_2weeks', 0),
            'rtime_last_played': steam_game.get('rtime_last_played'),
            'steam_fetched_at': now,
        })

    def set_hltb(self, appid, hltb_data):
        entry = self._data['games'].setdefault(str(appid), {'appid': appid})
        entry['hltb'] = hltb_data
        entry['hltb_fetched_at'] = int(time.time())

    def invalidate_hltb(self, appid):
        entry = self._data['games'].get(str(appid))
        if not entry:
            return

        entry.pop('hltb', None)
        entry.pop('hltb_fetched_at', None)

    def invalidate_steam_game(self, appid):
        entry = self._data['games'].get(str(appid))
        if not entry:
            return

        entry.pop('steam_fetched_at', None)
        entry.pop('playtime_forever', None)
        entry.pop('playtime_2weeks', None)
        entry.pop('rtime_last_played', None)

    def invalidate_all(self):
        self._data['library_fetched_at'] = None
        for entry in self._data['games'].values():
            entry.pop('hltb', None)
            entry.pop('hltb_fetched_at', None)
            entry.pop('steam_fetched_at', None)

    def count_cached_hltb(self, appids, max_age_days=0):
        return sum(1 for appid in appids if self.has_hltb(appid, max_age_days))
