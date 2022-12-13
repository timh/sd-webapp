import json
from flask import Flask
import load

app = Flask(__name__)

@app.route('/')
def hello_world():
    return 'Hello, World!'

@app.route('/models')
def list_models():
    models = load.list_models()
    res = [model.to_dict() for model in models]
    res = json.dumps(res, indent=2)
    print(res)
    return res
