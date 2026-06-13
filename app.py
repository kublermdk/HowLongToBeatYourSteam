import json
from pathlib import Path

from flask import Flask, Response, jsonify, request, send_file, send_from_directory, stream_with_context

from config import DEBUG, FETCH_STEAM_REVIEWS, FETCH_STORE_METADATA, HOST, PORT, PROJECT_ROOT, STEAM_ID
from core.image_cache import ensure_image, image_path
from core.library_service import LibraryService

app = Flask(__name__, static_folder=None)
FRONTEND_DIST = PROJECT_ROOT / 'frontend' / 'dist'


@app.route('/api/config')
def api_config():
    return jsonify({
        'defaultSteamId': STEAM_ID or None,
        'fetchStoreMetadata': FETCH_STORE_METADATA,
        'fetchSteamReviews': FETCH_STEAM_REVIEWS,
    })


def parse_show_hidden_param():
    param = request.args.get('showHidden')
    if param is None:
        return None
    return param.lower() in ('1', 'true', 'yes')


@app.route('/api/library/<steam_id>')
def api_library(steam_id):
    result = LibraryService.get_library(steam_id, show_hidden=parse_show_hidden_param())
    if 'error' in result:
        return jsonify({'error': result['error']}), 400
    return jsonify(result)


@app.route('/api/library/<steam_id>/sync')
def api_library_sync(steam_id):
    show_hidden = parse_show_hidden_param()

    def generate():
        for event in LibraryService.iter_sync(steam_id, show_hidden=show_hidden):
            yield f'data: {json.dumps(event)}\n\n'

    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
        },
    )


@app.route('/api/hidden-debug/<steam_id>')
def api_hidden_debug(steam_id):
    from core.steam_hidden_games import get_hidden_debug

    return jsonify(get_hidden_debug(steam_id))


@app.route('/api/library/<steam_id>/sync-reviews')
def api_library_sync_reviews(steam_id):
    show_hidden = parse_show_hidden_param()

    def generate():
        for event in LibraryService.iter_sync_reviews(steam_id, show_hidden=show_hidden):
            yield f'data: {json.dumps(event)}\n\n'

    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
        },
    )


@app.route('/api/images/<int:app_id>')
def api_images(app_id):
    path = image_path(app_id)
    if not path.is_file():
        path = ensure_image(app_id)
    if not path or not path.is_file():
        return jsonify({'error': 'Image not found'}), 404
    return send_file(path, mimetype='image/jpeg', max_age=86400)


@app.route('/api/games/<steam_id>/<int:app_id>/store')
def api_game_store(steam_id, app_id):
    if not FETCH_STORE_METADATA:
        return jsonify({'error': 'Store metadata fetching is disabled in config.'}), 403

    game = LibraryService.fetch_store_for_game(steam_id, app_id)
    if not game:
        return jsonify({'error': 'Store metadata not available for this game.'}), 404

    return jsonify({'store': game.get('store'), 'release': game.get('release')})


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def spa(path):
    if path.startswith('api/'):
        return jsonify({'error': 'Not found'}), 404

    if FRONTEND_DIST.is_dir() and (FRONTEND_DIST / 'index.html').is_file():
        requested = FRONTEND_DIST / path
        if path and requested.is_file():
            return send_from_directory(FRONTEND_DIST, path)
        return send_from_directory(FRONTEND_DIST, 'index.html')

    return (
        'Frontend not built. Run: cd frontend && npm install && npm run build',
        503,
        {'Content-Type': 'text/plain'},
    )


if __name__ == '__main__':
    app.run(debug=DEBUG, host=HOST, port=PORT, threaded=True)
