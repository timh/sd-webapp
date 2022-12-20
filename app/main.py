import json
from typing import List, Dict, Tuple
from flask import Flask, request, make_response, Response
from flask_caching import Cache
import datetime

import load
from base_types import BaseModel, Model, ImageSet

app = Flask(__name__)

config = {
    "DEBUG": True,
    "CACHE_TYPE": "SimpleCache",
    "CACHE_DEFAULT_TIMEOUT": 30
}
app = Flask(__name__)
app.config.from_mapping(config)
cache = Cache(app)

def make_error(msg: str, code: int) -> Response:
    error = {
        "message": msg
    }
    resp = make_response(json.dumps(error, indent=2), code)
    resp.headers["Content-Type"] = "application/json"
    return resp

def make_json(obj) -> Response:
    if isinstance(obj, BaseModel):
        obj = obj.to_dict()
    resp = make_response(json.dumps(obj, indent=2))
    resp.headers["Content-Type"] = "application/json"
    return resp

@cache.cached(timeout=30)
def _load_models():
    return load.list_models()

@cache.cached(timeout=30)
def _load_imagesets():
    return load.list_imagesets()

@cache.cached(timeout=30)
def _load_image_dict():
    res: Dict[str, (ImageSet, int)] = dict()
    for imageset in _load_imagesets():
        for image in imageset.images:
            res[image.relpath()] = image
    return res

@app.route('/models')
def list_models():
    res = [model.to_dict() for model in _load_models()]
    return make_json(res)

@app.route('/imagesets')
def list_imagesets():
    res = [imageset.to_dict() for imageset in _load_imagesets()]
    return make_json(res)

@app.route('/image')
def get_image():
    filename = request.args.get("filename")
    if filename is None:
        return make_error("missing arg: filename", 400)

    image = _load_image_dict().get(filename, None)
    if image is None:
        return make_error("image not found", 404)

    return make_json(image)
