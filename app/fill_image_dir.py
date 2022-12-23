import re
from pathlib import Path
from load import IMAGE_DIR
from typing import List, Dict
from base_types import ImageSet, Image, SubModelSteps, SubModel, Model

OUTPUTS_DIR = Path("/home/tim/devel/outputs")

RE_MODEL_PARTS = re.compile(r"([^\/]+)--(.+)--(.+)")
RE_FILENAME = re.compile(r"\d+\.(\d+)\.png")
RE_SAMPLER = re.compile(r"([\w\+_]+)_(\d+),c(\d+)")

# alex44-everydream-e01_00440
# output_alex22_768-sd21@4.0_3300
#RE_MODEL = re.compile(r"^([\w\d_\.\-\+]+)_r(\d+)_(\d+)$")
#RE_MODEL_EVERYDREAM = re.compile(r"^([\w\d@_\-\+\.]+)_(\d+)$")

RE_MODEL_STEPS = re.compile(r"^(.+)_(\d+)$")
RE_MODEL_BATCH = re.compile(r"^(.+)-batch(\d+)(.*)$")
RE_MODEL_LR = re.compile(r"^(.+)@([\d\.]+)(.*)$")
RE_MODEL_SEED = re.compile(r"^(.+)_r(\d+)$")

# image with non-default path
class ImageWithPath(Image):
    src_path: Path
    def __init__(self, imageset: ImageSet, seed: int, src_path: Path):
        super().__init__(imageset, seed)
        self.src_path = src_path

# add images to an existing imageset
def add_images(path: Path, imageset: ImageSet) -> List[Image]:
    res: List[Image] = []
    for image_path in path.iterdir():
        match = RE_FILENAME.match(image_path.name)
        if not match:
            continue
        seed = int(match.group(1))
        image = ImageWithPath(imageset, seed, image_path)
        res.append(image)
    
    imageset.images.extend(res)
    return res

# path: directory with gen-many subdirs in it
def get_images_submodels(path: Path, models: Dict[str, Model], submodels: Dict[str, SubModel]) -> List[Image]:
    res: List[Image] = []
    for subdir in path.iterdir():
        match = RE_MODEL_PARTS.match(subdir.name)
        if not match:
            continue

        modelStr = match.group(1)
        modelName = modelStr
        modelSteps_int = 0
        modelSeed = 0
        modelBatch = 1
        modelLR = ""
        prompt = match.group(2)
        samplerCfg = match.group(3)

        match = RE_MODEL_BATCH.match(modelName)
        if match:
            modelBatch = int(match.group(2))
            modelName = match.group(1) + match.group(3)
        
        match = RE_MODEL_LR.match(modelName)
        if match:
            modelLR = match.group(2)
            modelName = match.group(1) + match.group(3)

        match = RE_MODEL_STEPS.match(modelName)
        if match:
            modelSteps_int = int(match.group(2))
            modelName = match.group(1)

        match = RE_MODEL_SEED.match(modelName)
        if match:
            modelSeed = int(match.group(2))
            modelName = match.group(1)
        
        samplerStr = ""
        cfg = 0
        match = RE_SAMPLER.match(samplerCfg)
        if match:
            samplerStr = match.group(1) + ":" + match.group(2)
            cfg = int(match.group(3))

        modelBase = ""
        for base in ["-f222v", "-sd21", "-inpainting"]:
            if base in modelName:
                modelBase = base[1:]
                modelName = modelName.replace(base, "")

        submodelExtras = modelName.split("-")
        if len(submodelExtras) > 1:
            modelName = submodelExtras[0]
            submodelExtras = set(submodelExtras[1:])
        else:
            submodelExtras = set()
        
        if modelName in models:
            model = models[modelName]
        else:
            model = Model(modelName, modelBase)

        if modelStr in submodels:
            submodel = submodels[modelStr]
        else:
            submodel = SubModel(model=model, submodelStr=modelStr, seed=modelSeed, batch=modelBatch, learningRate=modelLR, extras=submodelExtras)

        submodelSteps = SubModelSteps(submodel=submodel, steps=modelSteps_int)
        submodel.submodelSteps.append(submodelSteps)

        imageset = ImageSet(model=model, submodel=submodel, submodelSteps=submodelSteps, prompt=prompt, samplerStr=samplerStr, cfg=cfg)
        res.extend(add_images(subdir, imageset))
    
    return res

if __name__ == "__main__":
    models: Dict[str, Model] = dict()
    submodels: Dict[str, SubModel] = dict()
    images = get_images_submodels(Path("/home/tim/devel/outputs/alex12"), models, submodels)

    for image in images:
        new_path = IMAGE_DIR.joinpath(image.path())
        new_path.parent.mkdir(exist_ok=True, parents=True)
        if new_path.exists():
            continue
        orig_path = image.src_path
        print(f"{new_path} -> {orig_path}")
        new_path.symlink_to(orig_path)

