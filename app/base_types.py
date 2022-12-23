import json
from pathlib import Path
from typing import Iterable, Dict, Set, List
import inspect

class BaseModel:
    def to_dict(self) -> Dict[str, str]:
        attributes = sorted(self.__dict__.keys()) 

        res: Dict[str, str] = {}
        for attr in attributes:
            value = getattr(self, attr)
            if isinstance(value, set):
                value = list(value)
            if isinstance(value, Iterable) and len(value) > 0 and isinstance(value[0], BaseModel):
                value = [child.to_dict() for child in value]
            if not isinstance(value, list) and not isinstance(value, str) and not isinstance(value, int) and not isinstance(value, float):
                print(f"skip attribute {attr} value {value}")
                continue
            res[attr] = value
        
        res["key"] = self.get_key()
        return res
    
    def get_key(self) -> str:
        res: List[str] = []
        for attr in sorted(self.__dict__.keys()):
            value = getattr(self, attr)

            if isinstance(value, int) or isinstance(value, str):
                res.append(f"{attr}={value}")
            elif isinstance(value, set):
                values: List[str] = []
                for item in sorted(list(value)):
                    values.append(str(item))
                values_str = ",".join(values)
                res.append(f"{attr}=({values_str})")
        
        return ",".join(res)

class SubModelSteps(BaseModel):
    steps: int

    def __init__(self, steps: int):
        self.steps = steps
    
    def to_dict(self):
        return self.steps

class SubModel(BaseModel):
    submodelStr: str
    seed: int
    batch: int
    learningRate: str
    submodelSteps: List[SubModelSteps]
    extras: Set[str]

    def __init__(self, submodelStr = "", seed = 0, batch = 1, learningRate = "", extras: Set[str] = set()):
        self.submodelStr = submodelStr
        self.seed = seed
        self.batch = batch
        self.learningRate = learningRate
        self.extras = extras
        self.submodelSteps = list()
    
    def get_key(self) -> str:
        res = []
        res.append(f"seed={self.seed}")
        res.append(f"batch={self.batch}")
        res.append(f"LR={self.learningRate}")
        if self.extras:
            # extras come at end.
            res.append(",".join(self.extras))
        return ",".join(res)

class Model(BaseModel):
    name: str
    base: str
    submodels: List[SubModel]

    def __init__(self, name = "", base = ""):
        self.name = name
        self.base = base
        self.submodels = list()
    
    def get_key(self) -> str:
        res = self.name
        if self.base:
            res += f"+{self.base}"
        return res

class ImageSet: pass
class Image(BaseModel):
    imageset: ImageSet
    seed: int

    def __init__(self, imageset: ImageSet, seed: int):
        self.imageset = imageset
        self.seed = seed

    def relpath(self) -> Path:
        png = f"{self.seed:010}.png"
        return self.imageset.relpath().joinpath(png)

class ImageSet(BaseModel):
    model: Model
    submodel: SubModel
    submodelSteps: SubModelSteps
    samplerStr: str
    cfg: int
    prompt: str
    images: List[Image]

    def __init__(self, model: Model, submodel: SubModel, submodelSteps: SubModelSteps, prompt: str, samplerStr: str, cfg: int, seeds: Iterable[int] = []):
        self.model = model
        self.submodel = submodel
        self.submodelSteps = submodelSteps
        self.prompt = prompt
        self.samplerStr = samplerStr
        self.cfg = cfg

        self.seeds = list()
        for seed in seeds:
            self.images.append(Image(self, seed))
        self.images = list()

    def relpath(self) -> Path:
        endStr = f"sampler={self.samplerStr},cfg={self.cfg}"
        return Path(self.model.get_key(), self.submodel.get_key(), self.submodelSteps.get_key(), self.prompt, endStr)
