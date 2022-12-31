import re
from pathlib import Path
from load import IMAGE_DIR
from typing import List, Dict
from base_types import ImageSet, Image, SubModelSteps, SubModel, Model

OUTPUTS_DIR = Path("/home/tim/devel/outputs")
APP_DIR = Path(OUTPUTS_DIR, "app-images")

RE_MODEL_PARTS = re.compile(r"([^\/]+)--(.+)--(.+)$")
RE_FILENAME = re.compile(r"\d+\.(\d+)\.png")
RE_SETTINGS_SAMPLER = re.compile(r"([\w\d\+_]+)_(\d+)")
RE_SETTINGS_CFG = re.compile(r"c(\d+)")
RE_SETTINGS_WIDTH = re.compile(r"width(\d+)")
RE_SETTINGS_HEIGHT = re.compile(r"height(\d+)")
RE_MODEL_STEPS = re.compile(r"^(.+)_(\d+)$")
RE_MODEL_BATCH = re.compile(r"^(.+)-batch(\d+)(.*)$")
RE_MODEL_LR = re.compile(r"^(.+)@([\d\.]+)(.*)$")
RE_MODEL_LR2 = re.compile(r"^(.+)[\-|\+]([\d]+\.[\d]+e-[\d]+)(.*)$")
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
        settings = match.group(3)

        match = RE_MODEL_BATCH.match(modelName)
        if match:
            modelBatch = int(match.group(2))
            modelName = match.group(1) + match.group(3)

        match = RE_MODEL_LR.match(modelName)
        if match:
            modelLR = match.group(2)
            modelName = match.group(1) + match.group(3)
        else:
            match = RE_MODEL_LR2.match(modelName)
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
        width, height = 512, 512
        for setting in settings.split(","):
            match = RE_SETTINGS_SAMPLER.match(setting)
            if match:
                samplerStr = match.group(1) + ":" + match.group(2)
                continue
            match = RE_SETTINGS_CFG.match(setting)
            if match:
                cfg = int(match.group(1))
                continue
            match = RE_SETTINGS_WIDTH.match(setting)
            if match:
                width = int(match.group(1))
                continue
            match = RE_SETTINGS_HEIGHT.match(setting)
            if match:
                height = int(match.group(1))
                continue
            print(f"unknown setting {setting} for subdir {subdir}")

        modelBase = ""
        for base in ["f222v", "f222", "sd21", "sd20", "sd15", "inpainting", "hassanblend", "ppp"]:
            for ch in ["-", "+"]:
                substr = ch + base
                if substr in modelName:
                    modelBase = base
                    modelName = modelName.replace(substr, "")

        submodelExtras = re.compile("[\-|\+]").split(modelName)
        # submodelExtras = modelName.split("-")
        if not modelName.startswith("stable"):
            if len(submodelExtras) > 1:
                modelName = submodelExtras[0]
                submodelExtras = list(submodelExtras[1:])
            else:
                submodelExtras = list()

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

        imageset = ImageSet(model=model, submodel=submodel, submodelSteps=submodelSteps, prompt=prompt, samplerStr=samplerStr, cfg=cfg, width=width, height=height)
        res.extend(add_images(subdir, imageset))
    
    return res

if __name__ == "__main__":
    models: Dict[str, Model] = dict()
    submodels: Dict[str, SubModel] = dict()

    for subdir in Path("/home/tim/devel/outputs").iterdir():
        if not Path(subdir, "filelist.txt").exists() or subdir.name == "app-images" or subdir.name.startswith("class_images"):
            continue
        images = get_images_submodels(subdir, models, submodels)

        for image in images:
            new_path = IMAGE_DIR.joinpath(image.path())
            new_path.parent.mkdir(exist_ok=True, parents=True)
            if new_path.exists():
                continue
            orig_path = image.src_path
            print(f"{new_path.relative_to(APP_DIR)} ->")
            print(f"  {orig_path.relative_to(OUTPUTS_DIR)}")
            new_path.symlink_to(orig_path)
        

