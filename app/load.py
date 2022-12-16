from typing import Iterable, List, Set, Dict
from pathlib import Path
import re

from base_types import SubModel, Model

DIR = Path("/home/tim/models")

# alex22-f222v-batch1@1.0_r0
# alex22-f222v-batch2-cap-bf16@4.0_r0
RE_DIR = re.compile(r"^(.+)@([\d\.]+)_r(\d+)")

# alex22-f222v-batch1
# alex22-f222v-batch2-cap-bf16
RE_BATCH = re.compile(r"(.+)-batch(\d+)(.*)")

def list_models() -> Iterable[Model]:
    res: Dict[str, Model] = dict()

    for subdir in DIR.iterdir():
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
