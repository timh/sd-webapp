import json
from typing import List, Dict, Tuple
from flask import Flask, request, make_response, Response
from flask_caching import Cache
import datetime
from pathlib import Path

import load
from base_types import BaseModel, Model, SubModelSteps, ImageSet, Image

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

@cache.cached(timeout=10)
def _model_list() -> List[Model]:
    return load.list_models()

@cache.cached(timeout=10)
def _submodelsteps_dict() -> Dict[str, SubModelSteps]:
    res: Dict[str, SubModelSteps] = dict()

    for model in _model_list():
        for submodel in model.submodels:
            for oneSteps in submodel.submodelSteps:
                res[str(oneSteps.image_path())] = oneSteps
    
    return res

@app.route('/api/models')
def list_models():
    res = [model.to_dict() for model in _model_list()]
    return make_json(res)

@app.route('/api/imagesets')
def list_imagesets():
    path = request.args.get("path")
    if not path:
        return make_error("missing arg: path", 400)

    oneSteps = _submodelsteps_dict().get(path)
    if oneSteps is None:
        keys = [key for key in _submodelsteps_dict().keys() if "tim15" in key]
        print(f"keys = {keys}")
        return make_error(f"no such path: {path}", 404)

    imagesets = load.load_imagesets_for_submodelsteps(oneSteps)
    res = [imageset.to_dict() for imageset in imagesets]
    res = {"imagesets": res}
    return make_json(res)

