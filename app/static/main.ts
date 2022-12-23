import { Model, SubModel, SubModelSteps, ImageSet, Image } from "./base_types.js"
import { sort, createElement } from "./util.js"
import { StoredVal } from "./storage.js"

const MODEL_FIELDS = ["name", "base"]
const SUBMODEL_FIELDS = ["submodelStr", "seed", "batch", "learningRate"]
const DESELECTED = "deselected"

const STORE_VIS_MODEL = new StoredVal('vis_model', new Set<string>(), (storage) => Array.from(storage), (jsonVal) => new Set(jsonVal))
const STORE_VIS_SUBMODEL = new StoredVal('vis_submodel', new Set<string>(), (storage) => Array.from(storage), (jsonVal) => new Set(jsonVal))
const STORE_VIS_SUBMODEL_STEPS = new StoredVal('vis_submodelSteps', new Set<string>(), (storage) => Array.from(storage), (jsonVal) => new Set(jsonVal))
const STORE_VIS_IMAGESET = new StoredVal('vis_imageSet', new Set<string>(), (storage) => Array.from(storage), (jsonVal) => new Set(jsonVal))

var allModels: Array<Model>
var allSubmodelStepsVisible: Map<string, SubModelSteps> = new Map()

// (short) imageset keys that are visible.
var allImageSetsVisible: Set<string> = new Set()

function loadVisibility() {
    const visModel = STORE_VIS_MODEL.get()
    const visSubmodel = STORE_VIS_SUBMODEL.get()
    const visSubmodelSteps = STORE_VIS_SUBMODEL_STEPS.get()

    for (const model of allModels) {
        model.visible = visModel.has(model.path)
        for (const submodel of model.submodels) {
            submodel.visible = visSubmodel.has(submodel.path)
            for (const oneSteps of submodel.submodelSteps) {
                oneSteps.visible = visSubmodelSteps.has(oneSteps.path)
                allSubmodelStepsVisible.set(oneSteps.path, oneSteps)
            }
        }
    }

    const visImageSet = STORE_VIS_IMAGESET.get()
    for (const imagesetKey of visImageSet) {
        allImageSetsVisible.add(imagesetKey)
    }
}

function toggleVisModel(model: Model) {
    model.visible = !model.visible
    console.log(`toggle model ${model.name} to ${model.visible}`)
    if (model.visible) {
        STORE_VIS_MODEL.get().add(model.path)
    }
    else {
        STORE_VIS_MODEL.get().delete(model.path)
    }
    STORE_VIS_MODEL.save()
    renderModels()
}

function toggleVisSubmodel(submodel: SubModel) {
    submodel.visible = !submodel.visible
    console.log(`toggle submodel ${submodel.submodelStr} to ${submodel.visible}`)
    if (submodel.visible) {
        STORE_VIS_SUBMODEL.get().add(submodel.path)
    }
    else {
        STORE_VIS_SUBMODEL.get().delete(submodel.path)
    }
    STORE_VIS_SUBMODEL.save()
    renderModels()
}

function toggleVisSubmodelSteps(submodelSteps: SubModelSteps) {
    submodelSteps.visible = !submodelSteps.visible
    console.log(`toggle submodel steps to ${!submodelSteps.visible}; path = ${submodelSteps.path}`)
    if (submodelSteps.visible) {
        allSubmodelStepsVisible.set(submodelSteps.path, submodelSteps)
        STORE_VIS_SUBMODEL_STEPS.get().add(submodelSteps.path)
    }
    else {
        allSubmodelStepsVisible.delete(submodelSteps.path)
        STORE_VIS_SUBMODEL_STEPS.get().delete(submodelSteps.path)
    }
    STORE_VIS_SUBMODEL_STEPS.save()
    renderModels()
}

function toggleVisImageSet(imagesetKey: string) {
    if (allImageSetsVisible.has(imagesetKey)) {
        allImageSetsVisible.delete(imagesetKey)
        STORE_VIS_IMAGESET.get().delete(imagesetKey)
    }
    else {
        allImageSetsVisible.add(imagesetKey)
        STORE_VIS_IMAGESET.get().add(imagesetKey)
    }
    STORE_VIS_IMAGESET.save()
    renderModels()
}

function renderModels() {
    const rootElem = document.getElementById("models")!
    for (const child of Array.from(rootElem.children)) {
        if (!child.className.includes("header")) {
            rootElem.removeChild(child)
        }
    }

    for (const [modelIdx, model] of allModels.entries()) {
        const modelClass = `model_${modelIdx}`
        for (const field of MODEL_FIELDS) {
            const fieldElem = rootElem.appendChild(createElement("span", {class: field}, model[field].toString()))
            if (!model.visible) {
                fieldElem.classList.add(DESELECTED)
            }
            fieldElem.onclick = function(ev) { 
                toggleVisModel(model)
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
                    toggleVisSubmodel(submodel)
                    return false
                }
            }

            const stepsElem = createElement("span", {class: "submodelSteps"})
            for (const oneSteps of submodel.submodelSteps) {
                var stepsStr = oneSteps.steps.toString()
                if (oneSteps.canGenerate) {
                    stepsStr += "*"
                }
                const stepElem = stepsElem.appendChild(createElement("span", {class: "stepChoice"}, stepsStr))
                if (!oneSteps.visible || !submodel.visible || !model.visible) {
                    stepElem.classList.add(DESELECTED)
                }
                console.log(`oneSteps.step = ${oneSteps.steps} oneSteps.path = ${oneSteps.path}`)
                stepElem.onclick = function(ev) {
                    toggleVisSubmodelSteps(oneSteps)
                    return false
                }
            }

            rootElem.append(stepsElem)
        }
    }

    renderImages(rootElem)
}

function renderImages(rootElem: HTMLElement) {
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
            toggleVisImageSet(imagesetKey)
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

    loadVisibility()
}

loadModels().then((val2) => {
    console.log("fetched image sets / models")
    renderModels()
})
