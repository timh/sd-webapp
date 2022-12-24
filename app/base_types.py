import json
from pathlib import Path
from typing import Iterable, Dict, Set, List
import inspect

class BaseModel:
    def to_dict(self, attributes: Iterable[str] = None) -> Dict[str, any]:
        if attributes is None:
            attributes = sorted(self.__dict__.keys()) 

        res: Dict[str, any] = {}
        for attr in attributes:
            value = getattr(self, attr)
            if isinstance(value, set):
                value = list(value)
            if isinstance(value, Iterable) and len(value) > 0 and isinstance(value[0], BaseModel):
                value = [child.to_dict() for child in value]
            if not isinstance(value, list) and not isinstance(value, str) and not isinstance(value, int) and not isinstance(value, float) and not isinstance(value, bool):
                if attr == "model_path":
                    continue
                print(f"skip attribute {attr} value {value}")
                continue
            res[attr] = value
        
        res["key"] = self.get_key()
        return res
    
    def get_key(self, attributes: List[str] = None) -> str:
        res: List[str] = []
        if attributes is None:
            attributes = sorted(self.__dict__.keys())
        for attr in attributes:
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

class ImageSet: pass
class Model: pass
class SubModel: pass

class SubModelSteps(BaseModel):
    steps: int
    imageSets: List[ImageSet]
    submodel: SubModel
    canGenerate: bool
    model_path: Path

    def __init__(self, submodel: SubModel, steps: int, canGenerate: bool = False, model_path: Path = None):
        self.submodel = submodel
        self.steps = steps
        self.imageSets = list()
        self.canGenerate = canGenerate
        self.model_path = model_path
    
    def image_path(self) -> Path:
        return Path(self.submodel.image_path(), self.get_key())

    def get_key(self) -> str:
        return f"steps={self.steps}"

    def to_dict(self) -> Dict[str, any]:
        attributes = set(self.__dict__.keys())
        attributes.remove("submodel")
        res = super().to_dict(sorted(attributes))
        res['path'] = str(self.image_path())
        return res

class SubModel(BaseModel):
    submodelStr: str
    seed: int
    batch: int
    learningRate: str
    submodelSteps: List[SubModelSteps]
    extras: Set[str]
    model: Model

    def __init__(self, model: Model = None, submodelStr = "", seed = 0, batch = 1, learningRate = "", extras: Set[str] = set()):
        self.model = model
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
            res.append(",".join(sorted(list(self.extras))))
        return ",".join(res)

    def image_path(self) -> Path:
        return Path(self.model.image_path(), self.get_key())

    def to_dict(self) -> Dict[str, any]:
        attributes = set(self.__dict__.keys())
        attributes.remove("model")
        res = super().to_dict(sorted(attributes))
        res['path'] = str(self.image_path())
        return res

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

    def image_path(self) -> Path:
        return Path(self.get_key())

    def to_dict(self) -> Dict[str, any]:
        res = super().to_dict()
        res['path'] = str(self.image_path())
        return res
    
class Image(BaseModel):
    imageset: ImageSet
    seed: int

    def __init__(self, imageset: ImageSet, seed: int):
        self.imageset = imageset
        self.seed = seed

    def path(self) -> Path:
        png = f"{self.seed:010}.png"
        return Path(self.imageset.path(), png)

    def to_dict(self) -> Dict[str, any]:
        attributes = set(self.__dict__.keys())
        attributes.remove("imageset")
        res = super().to_dict(sorted(attributes))
        res['path'] = str(self.path())
        return res
    
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

        for seed in seeds:
            self.images.append(Image(self, seed))
        self.images = list()

    def get_key(self) -> str:
        return super().get_key(["prompt", "samplerStr", "cfg"])

    def path(self) -> Path:
        endStr = f"sampler={self.samplerStr},cfg={self.cfg}"
        return Path(self.model.get_key(), self.submodel.get_key(), self.submodelSteps.get_key(), self.prompt, endStr)

    def to_dict(self) -> Dict[str, any]:
        attributes = set(self.__dict__.keys())
        attributes.remove("model")
        attributes.remove("submodel")
        attributes.remove("submodelSteps")
        res = super().to_dict(sorted(attributes))
        res['path'] = str(self.path())
        return res
