from typing import Iterable, List, Set, Dict
from pathlib import Path
import re

from base_types import SubModel, Model, ImageSet

MODEL_DIR = Path("/home/tim/models")
IMAGE_DIR = Path("/home/tim/devel/outputs/app-images")

# alex22-f222v-batch1@1.0_r0
# alex22-f222v-batch2-cap-bf16@4.0_r0
RE_DIR = re.compile(r"^(.+)@([\d\.]+)_r(\d+)")

# alex22-f222v-batch1
# alex22-f222v-batch2-cap-bf16
RE_BATCH = re.compile(r"(.+)-batch(\d+)(.*)")

def list_models() -> Iterable[Model]:
    res: Dict[str, Model] = dict()

    for subdir in MODEL_DIR.iterdir():
        if not subdir.is_dir():
            continue

        contents = [path for path in subdir.iterdir() 
                    if path.name == "model_index.json" or path.joinpath("model_index.json").exists()]
        if len(contents) == 0:
            continue

        modelStr = subdir.name
        modelName = subdir.name
        modelBase = ""
        modelSeed = 0
        modelBatch = 1
        modelLR = ""
        modelExtras: Set[str] = set()

        match = RE_DIR.match(subdir.name)
        if match:
            modelName = match.group(1)
            modelSeed = int(match.group(3))
            modelLR = match.group(2)

        if "-f222v" in modelName:
            modelName = modelName.replace("-f222v", "")
            modelBase = "f222v"
        if "-sd15" in modelName:
            modelName = modelName.replace("-sd15", "")
            modelBase = "sd15"
        if "-cap" in modelName:
            modelName = modelName.replace("-cap", "")
            modelExtras.add("cap")
        if "-bf16" in modelName:
            modelName = modelName.replace("-bf16", "")
            modelExtras.add("bf16")
        
        
        match = RE_BATCH.match(modelName)
        if match:
            modelName = match.group(1) + match.group(3)
            modelBatch = int(match.group(2))

        if modelName in res:
            model = res[modelName]
        else:
            model = Model(modelName=modelName, modelBase=modelBase)
            res[modelName] = model

        submodel_args = {
            'modelStr': modelStr, 
            'modelSeed': modelSeed,
            'modelBatch': modelBatch, 'modelLR': modelLR,
            'modelExtras': modelExtras
        }
        submodel = SubModel(**submodel_args)
        model.submodels.append(submodel)

        for checkpoint in subdir.iterdir():
            if not checkpoint.is_dir():
                continue
            if not checkpoint.joinpath("model_index.json").exists():
                continue
        
            modelSteps = int(checkpoint.name.replace("checkpoint-", "").replace("save-", ""))
            submodel.modelSteps.append(modelSteps)
        
        if len(submodel.modelSteps) == 0:
            submodel.modelSteps.append(0)
        
        submodel.modelSteps = sorted(submodel.modelSteps)

    for model in res.values():
        model.submodels = sorted(model.submodels, key=lambda submodel: [submodel.modelBatch, submodel.modelLR, submodel.modelSeed])
    return sorted(list(res.values()), key=lambda model: model.modelName)

def list_imagesets() -> Iterable[ImageSet]:
    def subdirs(path: Path) -> List[Path]:
        return [item for item in path.iterdir() if item.is_dir()]

    res: List[Model] = list()
    for model_dir in subdirs(MODEL_DIR):
        name_parts = model_dir.name.split("+")
        modelName = name_parts[0]
        modelBase = name_parts[1] if len(name_parts) > 1 else ""

        print(f"model_dir {model_dir}, modelName {modelName}, modelBase {modelBase}")

        submodels: List[SubModel] = []
        for submodel_dir in subdirs(model_dir):
            modelBatch = 0
            modelLR = 1.0
            modelSeed = 0

            kv_pairs = submodel_dir.name.split(",")
            print(f"  - submodel_dir {submodel_dir}, kv_pairs {kv_pairs}")
            for kv_pair in kv_pairs:
                if not "=" in kv_pair:
                    print(f"    not a k/v pair {kv_pair}: submodel_dir = {submodel_dir}")
                    continue
                key, val = kv_pair.split("=")
                if key == "batch":
                    modelBatch = int(val)
                elif key == "LR":
                    modelLR = val
                elif key == "seed":
                    modelSeed = int(val)
                else:
                    raise ValueError(f"submodel_dir.name = {submodel_dir.name}; don't know how to parse key = {key}, val = '{val}'")

            modelSteps = []
            for steps_dir in subdirs(submodel_dir):
                print(f"    - steps_dir {steps_dir}")
                steps = steps_dir.name.replace("steps=", "")
                if not all([c.isdecimal() for c in steps]):
                    continue
                steps = int(steps)
                modelSteps.append(steps)

            if len(modelSteps) == 0:
                print(f"    * no steps directories, skipping submodel")
                continue

            submodel = SubModel(modelSeed=modelSeed, modelBatch=modelBatch, modelLR=modelLR, modelSteps=modelSteps)
            submodels.append(submodel)

        if len(submodels) == 0:
            print(f"  * no submodels, skipping model")
            continue

        model = Model(modelName, modelBase)
        res.append(model)
        model.submodels.extend([submodels])
        
    return res
