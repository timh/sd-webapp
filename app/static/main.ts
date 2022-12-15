import { Model, SubModel } from "./base_types.js"
import { sort, createElement } from "./util.js"

const MODEL_FIELDS = ["modelName", "modelBase"]
const SUBMODEL_FIELDS = ["modelStr", "modelSeed", "modelBatch", "modelLR"]

function renderModels() {
    const chooser = document.getElementById("chooser")!

    for (const model of models) {
        const modelElem = chooser.appendChild(createElement("ul"))
        for (const field of MODEL_FIELDS) {
            modelElem.appendChild(createElement("li", {}, `${field}: ${model[field]}`))
        }

        for (const [idx, submodel] of model.submodels.entries()) {
            const submodelElem = createElement("li", {}, `submodel ${idx}`)
            modelElem.appendChild(submodelElem)

            const attrElem = submodelElem.appendChild(createElement("ul"))
            for (const field of SUBMODEL_FIELDS) {
                attrElem.appendChild(createElement("li", {}, `${field}: ${submodel[field]}`))
            }

            const stepsItemElem = attrElem.appendChild(createElement("li", {}, "modelSteps"))
            const stepsElem = stepsItemElem.appendChild(createElement("ul"))
            for (const steps of submodel.modelSteps) {
                stepsElem.appendChild(createElement("li", {}, steps.toString()))
            }
        }
    }
}

var models: Array<Model>
async function loadModels() {
    var resp = await fetch("/models")

    const data = await resp.text()
    if (resp.ok) {
        models = new Array()
        const modelsIn = JSON.parse(data)
        for (const modelIn of modelsIn) {
            const model = Model.from_json(modelIn)
            models.push(model)
        }
    }
}

loadModels().then((val) => {
    console.log("fetched models.")
    renderModels()
})