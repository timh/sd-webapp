from typing import Iterable, List, Set, Dict
from pathlib import Path
import re

from base_types import SubModelSteps, SubModel, Model, ImageSet, Image

MODEL_DIR = Path("/home/tim/models")
IMAGE_DIR = Path("/home/tim/devel/outputs/app-images")

# alex22-f222v-batch1@1.0_r0
# alex22-f222v-batch2-cap-bf16@4.0_r0
RE_DIR = re.compile(r"^(.+)@([\d\.]+)_r(\d+)")

# alex22-f222v-batch1
# alex22-f222v-batch2-cap-bf16
RE_BATCH = re.compile(r"(.+)-batch(\d+)(.*)")

def subdirs(path: Path) -> List[Path]:
    return [item for item in path.iterdir() if item.is_dir()]

# add models that can generate new images to an existing list of models
def add_generatable_models(modelsWithImages: List[Model]) -> List[Model]:
    res = list(modelsWithImages)
    modelsByPath: Dict[str, Model] = dict()
    submodelsByPath: Dict[str, SubModel] = dict()
    stepsByPath: Dict[str, SubModelSteps] = dict()

    for model in modelsWithImages:
        modelsByPath[model.image_path()] = model
        for submodel in model.submodels:
            submodelsByPath[submodel.image_path()] = submodel
            for oneSteps in submodel.submodelSteps:
                stepsByPath[oneSteps.image_path()] = oneSteps

    for subdir in subdirs(MODEL_DIR):
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
        
        if not modelName.startswith("stable"):
            parts = modelName.split("-")
            if len(parts) > 1:
                modelName = parts[0]
                for part in parts[1:]:
                    if part.startswith("batch"):
                        modelBatch = int(part.replace("batch", ""))
                    else:
                        modelExtras.add(part)
        
        match = RE_BATCH.match(modelName)
        if match:
            modelName = match.group(1) + match.group(3)
            modelBatch = int(match.group(2))

        model = Model(name=modelName, base=modelBase)
        if model.image_path() in modelsByPath:
            model = modelsByPath[model.image_path()]
        else:
            modelsByPath[modelName] = model
            res.append(model)

        submodel = SubModel(model=model, submodelStr=modelStr, seed=modelSeed, batch=modelBatch, learningRate=modelLR, extras=modelExtras)
        if submodel.image_path() in submodelsByPath:
            submodel = submodelsByPath[submodel.image_path()]
        else:
            model.submodels.append(submodel)

        for checkpoint in subdirs(subdir):
            if not checkpoint.joinpath("model_index.json").exists():
                continue
        
            steps_int = int(checkpoint.name.replace("checkpoint-", "").replace("save-", ""))
            steps_obj = SubModelSteps(submodel=submodel, steps=steps_int)
            if steps_obj.image_path() in stepsByPath:
                steps_obj = stepsByPath[steps_obj.image_path()]
            else:
                submodel.submodelSteps.append(steps_obj)
            steps_obj.canGenerate = True
        
        if len(submodel.submodelSteps) == 0:
            submodel.submodelSteps.append(SubModelSteps(submodel, 0))
        
        submodel.submodelSteps = sorted(submodel.submodelSteps, key=lambda s: s.steps)

    return res

def list_models() -> List[Model]:
    res: List[Model] = list()
    for model_dir in subdirs(IMAGE_DIR):
        name_parts = model_dir.name.split("+")
        modelName = name_parts[0]
        modelBase = name_parts[1] if len(name_parts) > 1 else ""

        model = Model(modelName, modelBase)

        print(f"model_dir {model_dir}, modelName {modelName}, modelBase {modelBase}")

        for submodel_dir in subdirs(model_dir):
            modelBatch = 0
            modelLR = 1.0
            modelSeed = 0
            extras: Set[str] = set()

            kv_pairs = submodel_dir.name.split(",")
            print(f"  - submodel_dir {submodel_dir.name}, kv_pairs {kv_pairs}")
            for kv_pair in kv_pairs:
                if not "=" in kv_pair:
                    extras.add(kv_pair)
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

            submodel = SubModel(model=model, seed=modelSeed, batch=modelBatch, learningRate=modelLR, extras=extras)
            model.submodels.append(submodel)

            for steps_dir in subdirs(submodel_dir):
                print(f"    - steps_dir {steps_dir}")
                steps = steps_dir.name.replace("steps=", "")
                if not all([c.isdecimal() for c in steps]):
                    continue

                oneSteps = SubModelSteps(submodel=submodel, steps=int(steps))
                submodel.submodelSteps.append(oneSteps)

                _load_imagesets_for_submodelsteps(model, submodel, oneSteps, steps_dir)

            if len(submodel.submodelSteps) == 0:
                print(f"    * no steps directories, skipping submodel")
                continue

        if len(model.submodels) == 0:
            print(f"  * no submodels, skipping model")
            continue

        res.append(model)
    
    res = add_generatable_models(res)
    return sort_models(res)

# .../portrait photo of alexhin/sampler=dpm++1:50,cfg=7
def _load_imagesets_for_submodelsteps(model: Model, submodel: SubModel, oneSteps: SubModelSteps, steps_dir: Path):
    for prompt_dir in subdirs(steps_dir):
        prompt = prompt_dir.name
        for sampler_cfg_dir in subdirs(prompt_dir):
            kv_pairs_str = sampler_cfg_dir.name.split(",")
            kv_pairs: Dict[str, str] = {}
            for kv_pair in kv_pairs_str:
                key, val = kv_pair.split("=")
                kv_pairs[key] = val

            sampler = kv_pairs["sampler"]
            cfg = int(kv_pairs["cfg"])

            imageSet = ImageSet(model=model, submodel=submodel, submodelSteps=oneSteps,
                                prompt=prompt, samplerStr=sampler, cfg=cfg)
            oneSteps.imageSets.append(imageSet)

            for image_path in sampler_cfg_dir.iterdir():
                if not image_path.suffix == ".png":
                    continue
                seed = int(image_path.stem)

                image = Image(imageSet, seed)
                imageSet.images.append(image)

def sort_models(models: Iterable[Model]) -> Iterable[Model]:
    for model in models:
        model.submodels = sorted(model.submodels, key=lambda submodel: [submodel.batch, submodel.learningRate, submodel.seed, str(submodel.extras)])
        for submodel in model.submodels:
            submodel.submodelSteps = sorted(submodel.submodelSteps, key=lambda oneSteps: oneSteps.steps)
    return sorted(list(models), key=lambda model: model.name)
