from pathlib import Path

import requests

from config import get_image_cache_dir

STEAM_HEADER_URL = (
    'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/{app_id}/header.jpg'
)


def image_path(app_id):
    return get_image_cache_dir() / f'{app_id}.jpg'


def ensure_image(app_id):
    path = image_path(app_id)
    if path.is_file():
        return path

    url = STEAM_HEADER_URL.format(app_id=app_id)
    try:
        response = requests.get(url, timeout=15)
        if response.status_code != 200:
            return None

        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(response.content)
        return path
    except requests.RequestException:
        return None
