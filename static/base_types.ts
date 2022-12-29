const MODEL_FIELDS = ["name", "base"]
const SUBMODEL_FIELDS = ["submodelStr", "seed", "batch", "learningRate"]

class Image {
    seed: number
    path: string
    imageset: ImageSet

    constructor(imageset: ImageSet, seed: number, path: string) {
        this.imageset = imageset
        this.seed = seed
        this.path = path
    }

    static from_json(imageset: ImageSet, input: any): Image {
        return new Image(imageset, input.seed, input.path)
    }
}

class ImageSet {
    prompt: string
    samplerStr: string
    cfg: number
    path: string
    key: string
    images: Array<Image>
    width: number
    height: number
    visible: boolean

    hide: boolean

    submodelSteps: SubModelSteps

    constructor(submodelSteps: SubModelSteps, prompt: string, samplerStr: string, cfg: number, width: number, height: number, path: string, key: string) {
        this.submodelSteps = submodelSteps
        this.prompt = prompt
        this.samplerStr = samplerStr
        this.cfg = cfg
        this.width = width
        this.height = height
        this.path = path
        this.key = key
        this.images = new Array()
        this.visible = false
        this.hide = false
    }

    resolution(): string {
        return `${this.width}x${this.height}`
    }

    static from_json(submodelSteps: SubModelSteps, input: any): ImageSet {
        const res = new ImageSet(submodelSteps, input.prompt, input.samplerStr, input.cfg, input.width, input.height, input.path, input.key)
        res.hide = input.hide
        for (const image of input.images) {
            res.images.push(Image.from_json(res, image))
        }
        return res
    }
}

class BaseModel {
    path: string
    visible: boolean
    constructor(path: string) {
        this.path = path
        this.visible = false
    }
}

class SubModelSteps extends BaseModel {
    submodel: SubModel
    steps: number
    imagesets: Array<ImageSet>
    canGenerate: boolean

    constructor(path: string, submodel: SubModel, steps: number, canGenerate: boolean) {
        super(path)
        this.submodel = submodel
        this.steps = steps
        this.imagesets = new Array()
        this.canGenerate = canGenerate
    }

    static from_json(submodel: SubModel, input: any): SubModelSteps {
        const res = new SubModelSteps(input.path, submodel, input.steps, input.canGenerate)
        for (const imageset of input.imageSets) {
            const oneIS = ImageSet.from_json(res, imageset)
            res.imagesets.push(oneIS)
        }
        return res
    }
}

class SubModel extends BaseModel {
    submodelStr: string
    seed: number
    submodelSteps: Array<SubModelSteps>
    batch: number
    learningRate: string
    extras: Set<string>
    model: Model
    canGenerate: boolean

    constructor(path: string, 
                 model: Model, submodelStr: string = "", seed: number = 0, batch: number = 1,
                 learningRate: string = "",
                 extras: Set<string> = new Set()) {
        super(path)
        this.visible = true
        this.model = model
        this.submodelStr = submodelStr
        this.seed = seed
        this.batch = batch
        this.learningRate = learningRate
        this.extras = extras
        this.submodelSteps = []
        this.canGenerate = false
    }

    static from_json(model: Model, input: any): SubModel {
        const res = new SubModel(input.path, model)
        res.submodelStr = input.submodelStr
        res.seed = input.seed
        res.batch = input.batch
        res.learningRate = input.learningRate
        res.extras = new Set(input.extras)

        for (const oneSteps of input.submodelSteps) {
            const submodelSteps = SubModelSteps.from_json(res, oneSteps)
            res.submodelSteps.push(submodelSteps)
            if (submodelSteps.canGenerate) {
                res.canGenerate = true
            }
        }
        return res
    }
}

class Model extends BaseModel {
    name: string
    base: string
    submodels: Array<SubModel>
    canGenerate: boolean

    constructor(path: string, name: string, base: string) {
        super(path)
        this.visible = true
        this.path = path
        this.name = name
        this.base = base
        this.submodels = new Array()
        this.canGenerate = false
    }

    static from_json(input: any): Model {
        const res = new Model(input.path, input.name, input.base)
        for (const submodelIn of input.submodels) {
            const submodel = SubModel.from_json(res, submodelIn)
            res.submodels.push(submodel)
            if (submodel.canGenerate) {
                res.canGenerate = true
            }
        }
        return res
    }
}
    
export { SubModelSteps, SubModel, Model, BaseModel, ImageSet, Image,
         MODEL_FIELDS, SUBMODEL_FIELDS }
