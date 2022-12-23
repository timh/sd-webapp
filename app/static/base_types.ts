class SubModelSteps {
    steps: number
    visible: boolean

    constructor(steps: number) {
        this.steps = steps
        this.visible = false
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

        for (const stepsNum of input.submodelSteps) {
            const submodelSteps = new SubModelSteps(stepsNum)
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
    
export { SubModelSteps, SubModel, Model }
