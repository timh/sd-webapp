import { Model, SubModel, SubModelSteps, ImageSet, Image } from "./base_types.js"
import { sort, createElement } from "./util.js"

const MODEL_FIELDS = ["name", "base"]
const SUBMODEL_FIELDS = ["submodelStr", "seed", "batch", "learningRate"]
const DESELECTED = "deselected"

var allModels: Array<Model>
var allImageSets: Array<Model>
var allSubmodelStepsVisible: Map<string, SubModelSteps>

// (short) imageset keys that are visible.
var allImageSetsVisible: Set<string> = new Set()

function toggleVisModel(elementId: string, models: Array<Model>, model: Model) {
    model.visible = !model.visible
    console.log(`toggle model ${model.name} to ${model.visible}`)
    // renderModels()
}

function toggleVisSubmodel(elementId: string, models: Array<Model>, submodel: SubModel) {
    submodel.visible = !submodel.visible
    console.log(`toggle submodel ${submodel.submodelStr} to ${submodel.visible}`)
    // renderModels()
}

function toggleVisSubmodelSteps(elementId: string, models: Array<Model>, submodelSteps: SubModelSteps) {
    submodelSteps.visible = !submodelSteps.visible
    console.log(`toggle submodel steps to ${!submodelSteps.visible}; path = ${submodelSteps.path}`)
    if (submodelSteps.visible) {
        allSubmodelStepsVisible.set(submodelSteps.path, submodelSteps)
    }
    else {
        allSubmodelStepsVisible.delete(submodelSteps.path)
    }
    renderModels(elementId, models)
}

function toggleVisImageSet(elementId: string, models: Array<Model>, imagesetKey: string) {
    if (allImageSetsVisible.has(imagesetKey)) {
        allImageSetsVisible.delete(imagesetKey)
    }
    else {
        allImageSetsVisible.add(imagesetKey)
    }
    renderModels(elementId, models)
}

function renderModels(elementId: string, models: Array<Model>) {
    const rootElem = document.getElementById(elementId)!
    for (const child of Array.from(rootElem.children)) {
        if (!child.className.includes("header")) {
            rootElem.removeChild(child)
        }
    }

    for (const [modelIdx, model] of models.entries()) {
        const modelClass = `model_${modelIdx}`
        for (const field of MODEL_FIELDS) {
            const fieldElem = rootElem.appendChild(createElement("span", {class: field}, model[field].toString()))
            if (!model.visible) {
                fieldElem.classList.add(DESELECTED)
            }
            fieldElem.onclick = function(ev) { 
                toggleVisModel(elementId, models, model)
                return false
            }
        }

        for (const [submodelIdx, submodel] of model.submodels.entries()) {
            const submodelElems = new Array<HTMLElement>()

            const submodelClass = `${modelClass}_${submodelIdx}`
            const extrasString = Array.from(submodel.extras).join(" ")
            if (extrasString != "") {
                submodelElems.push(createElement("span", {class: "extras"}, extrasString))
            }

            for (const field of SUBMODEL_FIELDS) {
                // console.log(`field = ${field}`)
                const contents = submodel[field].toString()
                if (contents != "") {
                    submodelElems.push(createElement("span", {class: field}, contents))
                }
            }

            for (const elem of submodelElems) {
                if (!submodel.visible || !model.visible) {
                    elem.classList.add(DESELECTED)
                }
                rootElem.appendChild(elem)
                elem.onclick = function(ev) {
                    toggleVisSubmodel(elementId, models, submodel)
                    return false
                }
            }

            const stepsElem = createElement("span", {class: "submodelSteps"})
            for (const oneSteps of submodel.submodelSteps) {
                const stepElem = stepsElem.appendChild(createElement("span", {class: "stepChoice"}, oneSteps.steps.toString()))
                if (!oneSteps.visible || !submodel.visible || !model.visible) {
                    stepElem.classList.add(DESELECTED)
                }
                console.log(`oneSteps.step = ${oneSteps.steps} oneSteps.path = ${oneSteps.path}`)
                stepElem.onclick = function(ev) {
                    toggleVisSubmodelSteps(elementId, models, oneSteps)
                    return false
                }
            }

            rootElem.append(stepsElem)
        }
    }

    renderImages(elementId, models, rootElem)
}

function renderImages(elementId: string, models: Array<Model>, rootElem: HTMLElement) {
    const imagesElem = document.getElementById("images")!
    for (const child of Array.from(imagesElem.children)) {
        imagesElem.removeChild(child)
    }

    // imageset key -> images that match it.
    const isetKey2Images = new Map<string, Array<Image>>()
    for (const stepsPath of sort(allSubmodelStepsVisible.keys())) {
        const oneSteps = allSubmodelStepsVisible.get(stepsPath)!
        if (!oneSteps.visible || !oneSteps.submodel.visible || !oneSteps.submodel.model.visible) {
            continue
        }

        for (const imageset of oneSteps.imagesets) {
            const key = imageset.key
            if (!isetKey2Images.has(key)) {
                isetKey2Images.set(key, new Array())
            }
            const images = isetKey2Images.get(key)!
            for (const image of imageset.images) {
                images.push(image)
            }
        }
    }

    for (const imagesetKey of sort(isetKey2Images.keys())) {
        const isVisible = allImageSetsVisible.has(imagesetKey)
        const images = isetKey2Images.get(imagesetKey)!
        const imagesetStr = imagesetKey + ` (${images.length.toString()} images)`

        const imagesetSpan = createElement("span", {class: "imagesetChoice"}, imagesetStr)
        rootElem.appendChild(imagesetSpan)

        if (!isVisible) {
            imagesetSpan.classList.add("deselected")
        }
        else {
            for (const image of images) {
                const imageSrc = "/image?path=" + encodeURIComponent(image.path)
                const spanElem = imagesElem.appendChild(createElement("span", {class: "image"}))
                const thumbElem = spanElem.appendChild(createElement("img", {class: "thumbnail"})) as HTMLImageElement
                thumbElem.src = imageSrc

                const detailsElem = spanElem.appendChild(createElement("span", {class: "details"}))
                detailsElem.appendChild(createElement("div", {class: "attributes"}, image.path))
                const fullsizeElem = detailsElem.appendChild(createElement("img", {class: "fullsize"})) as HTMLImageElement
                fullsizeElem.src = imageSrc
            }
        }

        imagesetSpan.onclick = function(ev) {
            toggleVisImageSet(elementId, models, imagesetKey)
            return false
        }
    }
}

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
    allSubmodelStepsVisible = new Map()
    console.log("fetched models.")
    //renderModels('models', allModels)
    loadImageSets().then((val2) => {
        console.log("fetched image sets.")
        renderModels('imagesets', allImageSets)
    })
})