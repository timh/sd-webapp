import json
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
    
if __name__ == "__main__":
    m = Model(modelStr="foo")
    d = m.to_dict()
    print(f"d = {d}")
