import { Model, SubModel, SubModelSteps } from "./base_types.js"
import { sort, createElement } from "./util.js"

const MODEL_FIELDS = ["name", "base"]
const SUBMODEL_FIELDS = ["submodelStr", "seed", "batch", "learningRate"]
const DESELECTED = "deselected"

function toggleVisModel(model: Model) {
    model.visible = !model.visible
    console.log(`toggle model ${model.name} to ${model.visible}`)
    // renderModels()
}

function toggleVisSubmodel(submodel: SubModel) {
    submodel.visible = !submodel.visible
    console.log(`toggle submodel ${submodel.submodelStr} to ${submodel.visible}`)
    // renderModels()
}

function toggleVisSubmodelSteps(submodelSteps: SubModelSteps) {
    submodelSteps.visible = !submodelSteps.visible
    console.log(`toggle submodel steps to ${submodelSteps.steps}}`)
    // renderModels()
}


function renderModels(elementId: string, models: Array<Model>) {
    const chooser = document.getElementById(elementId)!
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
            const extrasString = Array.from(submodel.extras).join(" ")
            if (extrasString != "") {
                submodelElems.push(createElement("span", {class: "extras"}, extrasString))
            }

            for (const field of SUBMODEL_FIELDS) {
                console.log(`field = ${field}`)
                const contents = submodel[field].toString()
                if (contents != "") {
                    submodelElems.push(createElement("span", {class: field}, contents))
                }
            }

            const stepsElem = createElement("span", {class: "submodelSteps"})
            for (const oneSteps of submodel.submodelSteps) {
                const stepElem = stepsElem.appendChild(createElement("span", {class: "stepChoice"}, oneSteps.steps.toString()))
                if (!oneSteps.visible || !submodel.visible || !model.visible) {
                    stepElem.classList.add(DESELECTED)
                }
                stepElem.onclick = function(ev) { toggleVisSubmodelSteps(oneSteps); return false }
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

var allModels: Array<Model>
var allImageSets: Array<Model>
async function loadModels() {
    var resp = await fetch("/models")

    const data = await resp.text()
    if (resp.ok) {
        allModels = new Array()
        const modelsIn = JSON.parse(data)
        for (const modelIn of modelsIn) {
            const model = Model.from_json(modelIn)
            allModels.push(model)
        }
    }
}

async function loadImageSets() {
    var resp = await fetch("/imagesets")

    const data = await resp.text()
    if (resp.ok) {
        allImageSets = new Array()
        const modelsIn = JSON.parse(data)
        for (const modelIn of modelsIn) {
            const model = Model.from_json(modelIn)
            allImageSets.push(model)
        }
    }
}

loadModels().then((val) => {
    console.log("fetched models.")
    loadImageSets().then((val2) => {
        console.log("fetched image sets.")
        renderModels('models', allModels)
        renderModels('imagesets', allImageSets)
    })
})