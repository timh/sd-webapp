class Image {
    seed: number
    path: string

    constructor(seed: number, path: string) {
        this.seed = seed
        this.path = path
    }

    static from_json(input: any): Image {
        return new Image(input.seed, input.path)
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

    constructor(prompt: string, samplerStr: string, cfg: number, path: string, key: string) {
        this.prompt = prompt
        this.samplerStr = samplerStr
        this.cfg = cfg
        this.path = path
        this.key = key
        this.images = new Array()
        this.visible = false
    }

    static from_json(input: any): ImageSet {
        const res = new ImageSet(input.prompt, input.samplerStr, input.cfg, input.path, input.key)
        for (const image of input.images) {
            res.images.push(Image.from_json(image))
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

    constructor(steps: number, path: string) {
        this.path = path
        this.steps = steps
        this.visible = false
        this.rendered = false
        this.imagesets = new Array()
    }

    static from_json(input: any): SubModelSteps {
        const res = new SubModelSteps(input.steps, input.path)
        console.log(`input.path = ${input.path}`)
        for (const imageset of input.imageSets) {
            const oneIS = ImageSet.from_json(imageset)
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

    constructor(submodelStr: string = "", seed: number = 0, batch: number = 1,
                 learningRate: string = "",
                 extras: Set<string> = new Set()) {
        this.submodelStr = submodelStr
        this.seed = seed
        this.batch = batch
        this.learningRate = learningRate
        this.extras = extras
        this.visible = true
        this.submodelSteps = []
    }

    static from_json(input: any): SubModel {
        const res = new SubModel()
        res.submodelStr = input.submodelStr
        res.seed = input.seed
        res.batch = input.batch
        res.learningRate = input.learningRate
        res.extras = new Set(input.extras)

        for (const oneSteps of input.submodelSteps) {
            const submodelSteps = SubModelSteps.from_json(oneSteps)
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

    constructor(name: string = "", base: string = "") {
        this.name = name
        this.base = base
        this.submodels = new Array()
        this.visible = true
    }

    static from_json(input: any): Model {
        const res = new Model()
        res.name = input.name
        res.base = input.base
        for (const submodelIn of input.submodels) {
            res.submodels.push(SubModel.from_json(submodelIn))
        }
        return res
    }
}
    
export { SubModelSteps, SubModel, Model, ImageSet, Image }
