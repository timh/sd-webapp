import json
from typing import List
from flask import Flask
import datetime

import load
from base_types import Model, ImageSet

app = Flask(__name__)

@app.route('/models')
def list_models():
    global g_models
    # ensure_loaded()

    res = [model.to_dict() for model in load.list_models()]
    res = json.dumps(res, indent=2)
    print(res)
    return res

@app.route('/imagesets')
def list_imagesets():
    global g_imageSets
    # ensure_loaded()

    res = [imageset.to_dict() for imageset in load.list_imagesets()]
    res = json.dumps(res, indent=2)
    print(res)
    return res
