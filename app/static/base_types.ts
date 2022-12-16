
class SubModel {
    modelStr: string
    modelSeed: number
    modelStepsVisible: Map<number, boolean>
    modelSteps: Array<number>
    modelBatch: number
    modelLR: string
    modelExtras: Set<string>
    visible: boolean

    constructor(modelStr: string = "", modelSeed: number = 0, modelBatch: number = 1,
                 modelLR: string = "", modelSteps: Array<number> = [],
                 modelExtras: Set<string> = new Set()) {
        this.modelStr = modelStr
        this.modelSeed = modelSeed
        this.modelBatch = modelBatch
        this.modelLR = modelLR
        this.modelExtras = modelExtras
        this.modelSteps = modelSteps.sort()
        this.modelStepsVisible = new Map()
        for (const steps of this.modelSteps) {
            this.modelStepsVisible.set(steps, true)
        }
        this.visible = true
    }

    static from_json(input: any): SubModel {
        const res = new SubModel()
        res.modelStr = input.modelStr
        res.modelSeed = input.modelSeed
        res.modelBatch = input.modelBatch
        res.modelLR = input.modelLR
        res.modelExtras = new Set(input.modelExtras)
        res.modelSteps = input.modelSteps
        for (const steps of res.modelSteps) {
            res.modelStepsVisible.set(steps, true)
        }
        return res
    }
}

class Model {
    modelName: string
    modelBase: string
    submodels: Array<SubModel>
    visible: boolean

    constructor(modelName: string = "", modelBase: string = "") {
        this.modelName = modelName
        this.modelBase = modelBase
        this.submodels = new Array()
        this.visible = true
    }

    static from_json(input: any): Model {
        const res = new Model()
        res.modelName = input.modelName
        res.modelBase = input.modelBase
        for (const submodelIn of input.submodels) {
            res.submodels.push(SubModel.from_json(submodelIn))
        }
        return res
    }
}
    
export { SubModel, Model }
