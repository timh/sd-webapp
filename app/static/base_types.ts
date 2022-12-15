
class SubModel {
    modelStr: string
    modelSeed: number
    modelSteps: Array<number>
    modelBatch: number
    modelLR: string
    modelExtras: Set<string>

    constructor(modelStr: string = "", modelSeed: number = 0, modelBatch: number = 1,
                 modelLR: string = "", modelSteps: Array<number> = [],
                 modelExtras: Set<string> = new Set()) {
        this.modelStr = modelStr
        this.modelSeed = modelSeed
        this.modelBatch = modelBatch
        this.modelLR = modelLR
        this.modelExtras = modelExtras
        this.modelSteps = modelSteps.sort()
    }

    static from_json(input: any): SubModel {
        const res = new SubModel()
        res.modelStr = input.modelStr
        res.modelSeed = input.modelSeed
        res.modelBatch = input.modelBatch
        res.modelLR = input.modelLR
        res.modelExtras = new Set(input.modelExtras)
        res.modelSteps = input.modelSteps
        return res
    }
}

class Model {
    modelName: string
    modelBase: string
    submodels: Array<SubModel>

    constructor(modelName: string = "", modelBase: string = "") {
        this.modelName = modelName
        this.modelBase = modelBase
        this.submodels = new Array()
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
