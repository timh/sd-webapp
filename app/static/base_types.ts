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
    visible: boolean

    submodelSteps: SubModelSteps

    constructor(submodelSteps: SubModelSteps, prompt: string, samplerStr: string, cfg: number, path: string, key: string) {
        this.submodelSteps = submodelSteps
        this.prompt = prompt
        this.samplerStr = samplerStr
        this.cfg = cfg
        this.path = path
        this.key = key
        this.images = new Array()
        this.visible = false
    }

    static from_json(submodelSteps: SubModelSteps, input: any): ImageSet {
        const res = new ImageSet(submodelSteps, input.prompt, input.samplerStr, input.cfg, input.path, input.key)
        for (const image of input.images) {
            res.images.push(Image.from_json(res, image))
        }
        return res
    }
}

class SubModelSteps {
    steps: number
    visible: boolean
    rendered: boolean
    imagesets: Array<ImageSet>
    path: string
    submodel: SubModel
    canGenerate: boolean

    constructor(submodel: SubModel, steps: number, path: string, canGenerate: boolean) {
        this.submodel = submodel
        this.path = path
        this.steps = steps
        this.visible = false
        this.rendered = false
        this.imagesets = new Array()
        this.canGenerate = canGenerate
    }

    static from_json(submodel: SubModel, input: any): SubModelSteps {
        const res = new SubModelSteps(submodel, input.steps, input.path, input.canGenerate)
        for (const imageset of input.imageSets) {
            const oneIS = ImageSet.from_json(res, imageset)
            res.imagesets.push(oneIS)
        }
        return res
    }
}

class SubModel {
    submodelStr: string
    seed: number
    submodelSteps: Array<SubModelSteps>
    batch: number
    learningRate: string
    extras: Set<string>
    visible: boolean
    model: Model

    constructor(model: Model, submodelStr: string = "", seed: number = 0, batch: number = 1,
                 learningRate: string = "",
                 extras: Set<string> = new Set()) {
        this.model = model
        this.submodelStr = submodelStr
        this.seed = seed
        this.batch = batch
        this.learningRate = learningRate
        this.extras = extras
        this.visible = true
        this.submodelSteps = []
    }

    static from_json(model: Model, input: any): SubModel {
        const res = new SubModel(model)
        res.submodelStr = input.submodelStr
        res.seed = input.seed
        res.batch = input.batch
        res.learningRate = input.learningRate
        res.extras = new Set(input.extras)

        for (const oneSteps of input.submodelSteps) {
            const submodelSteps = SubModelSteps.from_json(res, oneSteps)
            res.submodelSteps.push(submodelSteps)
        }
        return res
    }
}

class Model {
    name: string
    base: string
    submodels: Array<SubModel>
    visible: boolean

    constructor(name: string, base: string) {
        this.name = name
        this.base = base
        this.submodels = new Array()
        this.visible = true
    }

    static from_json(input: any): Model {
        const res = new Model(input.name, input.base)
        for (const submodelIn of input.submodels) {
            res.submodels.push(SubModel.from_json(res, submodelIn))
        }
        return res
    }
}
    
export { SubModelSteps, SubModel, Model, ImageSet, Image }
