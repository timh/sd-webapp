import json
from pathlib import Path
from typing import Iterable, Dict, Set, List
import inspect

class BaseModel:
    def to_dict(self, attributes_in: Iterable[str] = None) -> Dict[str, str]:
        if attributes_in is None:
            attributes = sorted(self.__dict__.keys()) 
        else:
            attributes = attributes_in
        
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
        return res

class SubModel(BaseModel):
    modelStr: str
    modelSeed: int
    modelSteps: List[int]
    modelBatch: int
    modelLR: str
    modelExtras: Set[str]

    def __init__(self, modelStr = "", modelSeed = 0, modelBatch = 1, modelLR = "", modelSteps: List[int] = [], modelExtras: Set[str] = set()):
        self.modelStr = modelStr
        self.modelSeed = modelSeed
        self.modelBatch = modelBatch
        self.modelLR = modelLR
        self.modelExtras = modelExtras
        self.modelSteps = sorted(modelSteps)

class Model(BaseModel):
    modelName: str
    modelBase: str
    submodels: List[SubModel]

    def __init__(self, modelName = "", modelBase = ""):
        self.modelName = modelName
        self.modelBase = modelBase
        self.submodels = list()

class ImageSet: pass
class Image:
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
    steps: int
    prompt: str
    images: List[Image]

    def __init__(self, model: Model, submodel: SubModel, steps: int, prompt: str, seeds: Iterable[int] = []):
        self.model = model
        self.submodel = submodel
        self.steps = steps
        self.prompt = prompt

        self.seeds = list()
        for seed in seeds:
            self.seeds.append(Image(self, seed))

    def relpath(self) -> Path:
        model_str = self.model.modelName
        if self.model.modelBase:
            model_str += f"+{self.model.modelBase}"
        submodel_str = f"batch={self.submodel.modelBatch},LR={self.submodel.modelLR},seed={self.submodel.modelSeed}"
        steps_str = f"steps={self.steps}"
        return Path(self.model.modelName, submodel_str, steps_str, self.prompt)

if __name__ == "__main__":
    m = Model(modelStr="foo")
    d = m.to_dict()
    print(f"d = {d}")
