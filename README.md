# HowLongToBeatYourSteam

A small web app that lists your Steam library alongside [HowLongToBeat](https://howlongtobeat.com/) completion estimates. Results stream in as they are looked up, and data is cached locally so repeat visits are much faster.

## What you get

- A sortable table of your Steam games
- HowLongToBeat times (main story, main + extra, completionist)
- Your playtime on each game
- Last played date (when Steam provides it)
- Local caching of Steam and HLTB data in `data/cache/`

## Requirements

- Python 3.10 or newer
- A [Steam Web API key](https://steamcommunity.com/dev/apikey)
- A public Steam game library (for the account you are querying)

## Setup

### 1. Clone or download the project

```bash
git clone https://github.com/Selfemra/HowLongToBeatYourSteam.git
cd HowLongToBeatYourSteam
```

### 2. Create a virtual environment (recommended)

**Windows (PowerShell):**

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**macOS / Linux:**

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install dependencies

```bash
python -m pip install flask requests howlongtobeatpy
```

This project uses three third-party libraries:

- `flask` — web server
- `requests` — Steam API calls
- `howlongtobeatpy` — HowLongToBeat lookups

### 4. Create your local config

Copy the example config to a local file that is not tracked by git:

**Windows (PowerShell):**

```powershell
copy config.local.example.py config.local.py
```

**macOS / Linux:**

```bash
cp config.local.example.py config.local.py
```

Edit `config.local.py` and set at least your Steam API key:

```python
STEAM_API_KEY = 'YOUR_KEY_HERE'
```

Get a key from https://steamcommunity.com/dev/apikey (log in with Steam, register a key, and use `localhost` as the domain if asked).

The app will not start without `config.local.py`. Do not commit that file to git.

#### Configuration options

All settings live in `config.local.py`. See `config.local.example.py` for the full template.

| Setting | Default | Description |
|--------|---------|-------------|
| `STEAM_API_KEY` | *(required)* | Your [Steam Web API key](https://steamcommunity.com/dev/apikey) |
| `STEAM_ID` | `''` | Your SteamID64; pre-fills the home page (also remembered in the browser) |
| `HOST` | `127.0.0.1` | Address the web server binds to |
| `PORT` | `5000` | Port the web server listens on |
| `DEBUG` | `True` | Flask debug mode (auto-reload and detailed errors) |
| `CACHE_ENABLED` | `True` | Save and reuse local cache files |
| `CACHE_DIR` | `data/cache` | Where cache files are stored (relative to project root) |
| `HLTB_CACHE_MAX_AGE_DAYS` | `0` | Re-fetch HowLongToBeat data after this many days; `0` = never expire |
| `CHECK_FOR_HIDDEN_GAMES` | `True` | Read your local Steam install to detect hidden games |
| `SHOW_HIDDEN_GAMES` | `False` | Include hidden games when `CHECK_FOR_HIDDEN_GAMES` is `True`; `False` excludes them |
| `STEAM_INSTALL_PATH` | `''` | Steam install folder; empty = auto-detect (e.g. `C:/Program Files (x86)/Steam`) |

Example with a custom port and 30-day HLTB refresh:

```python
STEAM_API_KEY = 'YOUR_KEY_HERE'
PORT = 8080
HLTB_CACHE_MAX_AGE_DAYS = 30
```

### 5. Make your Steam library public

Steam only returns owned games when profile privacy allows it:

1. Open Steam → your profile → **Edit Profile**
2. Go to **Privacy Settings**
3. Set **Game details** to **Public**

If you are viewing your own library, use an API key from the same Steam account to get **last played** dates. Steam often hides that field when querying another user’s account, even if their profile looks public.

## Running the app

From the project folder (with your virtual environment activated, if you use one):

```bash
python app.py
```

Then open http://127.0.0.1:5000 in your browser (or whatever `HOST` and `PORT` you set in `config.local.py`).

To stop the server, press `Ctrl+C` in the terminal.

## Using the app

1. Open http://127.0.0.1:5000
2. Enter your **Steam ID** (see below)
3. Click **Submit**
4. Watch the results page fill in as each game is processed
5. Use the **Sort by** buttons to reorder the table

The status bar shows progress, for example:

- `Found 342 games. 340 cached, looking up 2 of 2 on HowLongToBeat...`
- `Done. 342 games loaded. All HowLongToBeat data came from cache.`

### Finding your Steam ID

You need your **64-bit Steam ID** (SteamID64), not your profile display name.

**If your profile URL looks like this:**

```
https://steamcommunity.com/profiles/76561197960971312
```

The number at the end (`76561197960971312`) is your Steam ID.

**If your profile URL uses a custom name:**

```
https://steamcommunity.com/id/yourname
```

Use a converter such as [steamid.io](https://steamid.io/):

1. Paste your profile URL
2. Copy the **SteamID64** value
3. Paste that into the app

You can also find it in the Steam client: **Steam → Settings → Interface → enable “Display Steam URL address bar when available”**, then open your profile and copy the numeric ID from the URL.

## Caching

Results are stored per Steam account under `CACHE_DIR` (default `data/cache/{steam_id}.json`).

Each file caches:

- Steam game name, playtime, and last played time
- HowLongToBeat data (including games with no match, so they are not looked up again)

On each visit the app still makes **one Steam API call** to refresh your library and playtime, but it skips HowLongToBeat lookups for games already in the cache. The cache is saved after each game, so progress is kept if you stop mid-run.

This folder is listed in `.gitignore` and stays on your machine only.

## Hidden games

Steam’s **Hide this game** setting is stored locally in your Steam client, not in the Web API. When `CHECK_FOR_HIDDEN_GAMES` is `True` (default), the app reads `localconfig.vdf` from your Steam install and respects hidden status:

- `SHOW_HIDDEN_GAMES = False` — hidden games are excluded (default)
- `SHOW_HIDDEN_GAMES = True` — hidden games are included

Set `CHECK_FOR_HIDDEN_GAMES = False` to skip hidden-game processing entirely (useful if Steam is not installed on this machine).

Hidden detection requires the app to run on the same PC as your Steam client, with the Steam ID matching the userdata folder. Set `STEAM_INSTALL_PATH` if auto-detection fails.

## How it works

After you submit a Steam ID, the app:

1. Fetches your owned games from the Steam Web API
2. Loads any cached HowLongToBeat data for those games
3. Looks up only missing games on HowLongToBeat
4. Streams each row to the browser as it is ready

The first run can take a while for large libraries because HowLongToBeat lookups run one game at a time. Later runs are much faster when most data is cached.

## Troubleshooting

| Problem | What to check |
|--------|----------------|
| `Missing config.local.py` | Run `copy config.local.example.py config.local.py` and edit it |
| `ModuleNotFoundError: No module named 'flask'` | Run `python -m pip install flask requests howlongtobeatpy` |
| `401 Unauthorized` from Steam | Your API key is missing or invalid |
| No games returned | Steam ID wrong, or game library not public |
| Last played shows `—` | Use your own API key on your own Steam account |
| Slow first load | Normal for large libraries; cached runs are faster |
