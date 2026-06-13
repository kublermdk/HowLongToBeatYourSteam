import json

from flask import (
    Flask,
    Response,
    render_template,
    stream_with_context,
)

from core.games_info_getter import GamesInfoGetter
from config import DEBUG, HOST, PORT, STEAM_ID


app = Flask(__name__)

@app.route('/')
@app.route('/index')
def home():
    return render_template('index.html', default_steam_id=STEAM_ID)

@app.route('/results/<id>')
def results(id):
    return render_template('results.html', steam_id=id)

@app.route('/results/<id>/stream')
def results_stream(id):
    def generate():
        for event in GamesInfoGetter.iter_games_info(id):
            yield f'data: {json.dumps(event)}\n\n'

    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
        },
    )

if __name__ == '__main__':
    app.run(debug=DEBUG, host=HOST, port=PORT, threaded=True)
