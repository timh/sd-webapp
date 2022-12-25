import json
from typing import List, Dict, Tuple
from flask import Flask, request, make_response, Response
from flask_caching import Cache
import datetime
from pathlib import Path

import load
from base_types import BaseModel, Model, ImageSet, Image

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

def _load_models() -> List[Model]:
    return load.list_models()

@app.route('/api/models')
def list_models():
    res = [model.to_dict() for model in _load_models()]
    return make_json(res)

