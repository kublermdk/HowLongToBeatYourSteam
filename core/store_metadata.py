import re
import time
from datetime import datetime

import requests

STEAM_APPDETAILS_URL = 'https://store.steampowered.com/api/appdetails'
STEAM_APPREVIEWS_URL = 'https://store.steampowered.com/appreviews/{app_id}'

RELEASE_DATE_FORMATS = (
    '%d %b, %Y',
    '%b %d, %Y',
    '%d %B, %Y',
    '%B %d, %Y',
    '%b %Y',
    '%B %Y',
    '%Y',
)


def parse_steam_release_timestamp(date_str):
    if not date_str:
        return None

    cleaned = date_str.strip()
    if cleaned.lower() in ('coming soon', 'tbd', 'to be announced'):
        return None

    for fmt in RELEASE_DATE_FORMATS:
        try:
            return int(datetime.strptime(cleaned, fmt).timestamp())
        except ValueError:
            continue

    quarter_match = re.match(r'^Q([1-4])\s+(\d{4})$', cleaned, re.IGNORECASE)
    if quarter_match:
        quarter = int(quarter_match.group(1))
        year = int(quarter_match.group(2))
        month = (quarter - 1) * 3 + 2
        return int(datetime(year, month, 1).timestamp())

    return None


def is_early_access(data):
    for category in data.get('categories') or []:
        description = (category.get('description') or '').lower()
        if 'early access' in description:
            return True
    return False


def fetch_store_metadata(app_id):
    try:
        response = requests.get(
            STEAM_APPDETAILS_URL,
            params={'appids': app_id, 'l': 'english'},
            timeout=15,
        )
        if response.status_code != 200:
            return None

        payload = response.json().get(str(app_id))
        if not payload or not payload.get('success'):
            return None

        data = payload.get('data') or {}
        release_date = data.get('release_date') or {}
        release_label = release_date.get('date')
        release_timestamp = parse_steam_release_timestamp(release_label)

        return {
            'short_description': data.get('short_description'),
            'genres': [genre['description'] for genre in data.get('genres', [])],
            'developers': data.get('developers') or [],
            'release_date': release_label,
            'release_timestamp': release_timestamp,
            'early_access': is_early_access(data),
            'fetched_at': int(time.time()),
        }
    except requests.RequestException:
        return None


def fetch_steam_reviews(app_id):
    try:
        response = requests.get(
            STEAM_APPREVIEWS_URL.format(app_id=app_id),
            params={
                'json': 1,
                'language': 'english',
                'purchase_type': 'all',
                'num_per_page': 0,
            },
            timeout=15,
        )
        if response.status_code != 200:
            return None

        payload = response.json()
        if not payload.get('success'):
            return None

        summary = payload.get('query_summary') or {}
        return {
            'review_score': summary.get('review_score'),
            'review_score_desc': summary.get('review_score_desc'),
            'total_reviews': summary.get('total_reviews'),
            'total_positive': summary.get('total_positive'),
            'total_negative': summary.get('total_negative'),
            'fetched_at': int(time.time()),
        }
    except requests.RequestException:
        return None
