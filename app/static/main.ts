import { Model, SubModel } from "./base_types.js"
import { sort, createElement } from "./util.js"

const MODEL_FIELDS = ["modelName", "modelBase"]
const SUBMODEL_FIELDS = ["modelStr", "modelSeed", "modelBatch", "modelLR"]
const DESELECTED = "deselected"

function toggleVisModel(model: Model) {
    model.visible = !model.visible
    // console.log(`toggle model ${model.modelName} to ${model.visible}`)
    renderModels()
}

function toggleVisSubmodel(submodel: SubModel) {
    submodel.visible = !submodel.visible
    // console.log(`toggle submodel ${submodel.modelStr} to ${submodel.visible}`)
    renderModels()
}

function toggleVisSubmodelSteps(submodel: SubModel, steps: number) {
    submodel.modelStepsVisible.set(steps, !submodel.modelStepsVisible.get(steps))
    // console.log(`toggle submodel steps ${submodel.modelStr} ${steps} to ${submodel.modelStepsVisible.get(steps)}`)
    renderModels()
}


function renderModels() {
    const chooser = document.getElementById("chooser")!
    const children = Array.from(chooser.children)
    for (const child of children) {
        if (!child.className.includes("header")) {
            chooser.removeChild(child)
        }
    }

    for (const [modelIdx, model] of models.entries()) {
        const modelClass = `model_${modelIdx}`
        for (const field of MODEL_FIELDS) {
            const fieldElem = chooser.appendChild(createElement("span", {class: field}, model[field].toString()))
            if (!model.visible) {
                fieldElem.classList.add(DESELECTED)
            }
            fieldElem.onclick = function(ev) { toggleVisModel(model); return false }
        }

        for (const [submodelIdx, submodel] of model.submodels.entries()) {
            const submodelElems = new Array<HTMLElement>()

            const submodelClass = `${modelClass}_${submodelIdx}`
            const extrasString = Array.from(submodel.modelExtras).join(" ")
            if (extrasString != "") {
                submodelElems.push(createElement("span", {class: "modelExtras"}, extrasString))
            }

            for (const field of SUBMODEL_FIELDS) {
                const contents = submodel[field].toString()
                if (contents != "") {
                    submodelElems.push(createElement("span", {class: field}, contents))
                }
            }

            const stepsElem = createElement("span", {class: "submodelSteps"})
            for (const steps of submodel.modelSteps) {
                const stepElem = stepsElem.appendChild(createElement("span", {class: "stepChoice"}, steps.toString()))
                if (!submodel.modelStepsVisible.get(steps) || !submodel.visible || !model.visible) {
                    stepElem.classList.add(DESELECTED)
                }
                stepElem.onclick = function(ev) { toggleVisSubmodelSteps(submodel, steps); return false }
            }

            for (const elem of submodelElems) {
                if (!submodel.visible || !model.visible) {
                    elem.classList.add(DESELECTED)
                }
                chooser.appendChild(elem)
                elem.onclick = function(ev) { toggleVisSubmodel(submodel); return false }
            }
            chooser.append(stepsElem)
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