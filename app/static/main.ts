import { Model, SubModel, SubModelSteps, BaseModel, ImageSet, Image, MODEL_FIELDS, SUBMODEL_FIELDS } from "./base_types.js"
import { sort, createElement } from "./util.js"
import { StoredVal } from "./storage.js"

const DESELECTED = "deselected"

const STORE_VIS_MODEL = new StoredVal('vis_model', new Set<string>(), (storage) => Array.from(storage), (jsonVal) => new Set(jsonVal))
const STORE_VIS_SUBMODEL = new StoredVal('vis_submodel', new Set<string>(), (storage) => Array.from(storage), (jsonVal) => new Set(jsonVal))
const STORE_VIS_SUBMODEL_STEPS = new StoredVal('vis_submodelSteps', new Set<string>(), (storage) => Array.from(storage), (jsonVal) => new Set(jsonVal))
const STORE_VIS_PROMPT = new StoredVal('vis_prompt', new Set<string>(), (storage) => Array.from(storage), (jsonVal) => new Set(jsonVal))
const STORE_VIS_SAMPLER = new StoredVal('vis_sampler', new Set<string>(), (storage) => Array.from(storage), (jsonVal) => new Set(jsonVal))
const STORE_VIS_CFG = new StoredVal('vis_cfg', new Set<number>(), (storage) => Array.from(storage), (jsonVal) => new Set(jsonVal))

var allModels: Array<Model>
var allSubmodelStepsVisible: Map<string, SubModelSteps> = new Map()
var respectHide = true
const urlParams = new Proxy(new URLSearchParams(window.location.search), {
    get: (searchParams, prop) => searchParams.get(prop as string),
});
const paramFilterModels = ((urlParams as any).filter as string) || ""
const paramOnlyGenerate = ((urlParams as any).gen) != undefined

// on load, set model, submodel, submodelsteps, prompt, sampler, cfg, resolution visibility
// from local storage.
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
}

function toggleVisModel<T extends BaseModel>(model: BaseModel, store: StoredVal<Set<string>>) {
    model.visible = !model.visible
    console.log(`toggle ${model.path} to ${model.visible}`)
    if (model.visible) {
        store.get().add(model.path)
    }
    else {
        store.get().delete(model.path)
    }
    store.save()
    renderModels()
}

function toggleVisAttribute<T>(value: T, visibleSet: Set<T>, store: StoredVal<Set<T>>) {
    if (visibleSet.has(value)) {
        visibleSet.delete(value)
        store.get().delete(value)
    }
    else {
        visibleSet.add(value)
        store.get().add(value)
    }
    store.save()
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
        if (paramFilterModels && !model.name.includes(paramFilterModels)) {
            // HACK
            continue
        }
        if (paramOnlyGenerate && !model.canGenerate) {
            continue
        }
        const modelClass = `model_${modelIdx}`
        for (const field of MODEL_FIELDS) {
            const value = model[field].toString() + ((field == "name" && model.canGenerate) ? "*" : "")
            const fieldElem = rootElem.appendChild(createElement("span", {class: field}, value))
            if (!model.visible) {
                fieldElem.classList.add(DESELECTED)
            }
            fieldElem.onclick = function(ev) { 
                toggleVisModel(model, STORE_VIS_MODEL)
                return false
            }
        }

        for (const [submodelIdx, submodel] of model.submodels.entries()) {
            const submodelElems = new Array<HTMLElement>()
            if (paramOnlyGenerate && !submodel.canGenerate) {
                continue
            }

            const submodelClass = `${modelClass}_${submodelIdx}`
            const extrasString = Array.from(submodel.extras).join(" ")
            if (extrasString != "") {
                submodelElems.push(createElement("span", {class: "extras"}, extrasString))
            }

            for (const field of SUBMODEL_FIELDS) {
                // console.log(`field = ${field}`)
                const contents = submodel[field].toString() + ((field == "seed" && submodel.canGenerate) ? "*" : "")
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
                    toggleVisModel(submodel, STORE_VIS_SUBMODEL)
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
                // console.log(`oneSteps.step = ${oneSteps.steps} oneSteps.path = ${oneSteps.path} oneSteps.imagesets.length = ${oneSteps.imagesets.length}`)
                stepElem.onclick = function(ev) {
                    toggleVisModel(oneSteps, STORE_VIS_SUBMODEL_STEPS)
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

    const allPromptsVisible = STORE_VIS_PROMPT.get()
    const allSamplersVisible = STORE_VIS_SAMPLER.get()
    const allCfgsVisible = STORE_VIS_CFG.get()
    const allResolutionsVisible = STORE_VIS_RESOLUTION.get()

    const allPrompts = new Map<string, number>()
    const allSamplers = new Map<string, number>()
    const allCfgs = new Map<number, number>()
    const visibleImages = new Array<Image>()

    for (const stepsPath of sort(allSubmodelStepsVisible.keys())) {
        const oneSteps = allSubmodelStepsVisible.get(stepsPath)!
        const submodel = oneSteps.submodel
        const model = submodel.model
        if (paramFilterModels && !model.name.includes(paramFilterModels)) {
            continue
        }
        if (paramOnlyGenerate && !model.canGenerate) {
            continue
        }
        if (!oneSteps.visible || !submodel.visible || !model.visible) {
            continue
        }

        for (const imageset of oneSteps.imagesets) {
            const prompt = imageset.prompt
            if (respectHide && imageset.hide) {
                continue
            }
            if (!allPrompts.has(imageset.prompt)) {
                allPrompts.set(imageset.prompt, 0)
            }
            allPrompts.set(imageset.prompt, allPrompts.get(imageset.prompt)! + imageset.images.length)
            if (!allPromptsVisible.has(imageset.prompt)) {
                continue
            }

            if (!allSamplers.has(imageset.samplerStr)) {
                allSamplers.set(imageset.samplerStr, 0)
            }
            allSamplers.set(imageset.samplerStr, allSamplers.get(imageset.samplerStr)! + imageset.images.length)
            if (!allSamplersVisible.has(imageset.samplerStr)) {
                continue
            }

            if (!allCfgs.has(imageset.cfg)) {
                allCfgs.set(imageset.cfg, 0)
            }
            allCfgs.set(imageset.cfg, allCfgs.get(imageset.cfg)! + imageset.images.length)
            if (!allCfgsVisible.has(imageset.cfg)) {
                continue
            }

            for (const image of imageset.images) {
                visibleImages.push(image)
            }
        }
    }

    function renderChoice<T>(choice: T, visibleSet: Set<T>, store: StoredVal<Set<T>>, numAll: number) {
        const choiceStr = choice + ` (${numAll.toString()} images)`
        const choiceSpan = createElement("span", {class: "choice"}, choiceStr)
        rootElem.appendChild(choiceSpan)
        choiceSpan.onclick = function(ev) {
            toggleVisAttribute(choice, visibleSet, store)
            return false
        }

        if (!visibleSet.has(choice)) {
            choiceSpan.classList.add("deselected")
        }
    }

    for (const prompt of sort(allPrompts.keys())) {
        renderChoice(prompt, allPromptsVisible, STORE_VIS_PROMPT, allPrompts.get(prompt)!)
    }

    for (const sampler of sort(allSamplers.keys())) {
        renderChoice(sampler, allSamplersVisible, STORE_VIS_SAMPLER, allSamplers.get(sampler)!)
    }

    for (const cfg of sort(allCfgs.keys())) {
        renderChoice(cfg, allCfgsVisible, STORE_VIS_CFG, allCfgs.get(cfg)!)
    }

    for (const image of visibleImages) {
        const imageSrc = "/image/" + encodeURIComponent(image.path)

        const spanElem = imagesElem.appendChild(createElement("span", {class: "image"}))
        const thumbElem = spanElem.appendChild(createElement("img", {class: "thumbnail"})) as HTMLImageElement
        thumbElem.src = imageSrc

        const detailsElem = spanElem.appendChild(createElement("span", {class: "details"}))
        detailsElem.appendChild(createElement("div", {class: "attributes"}, image.path))
        const fullsizeElem = detailsElem.appendChild(createElement("img", {class: "fullsize"})) as HTMLImageElement
        fullsizeElem.src = imageSrc
    }
}

async function loadModels() {
    document.getElementById("loading")!.className = ""
    var resp = await fetch("/api/models")

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
    document.getElementById("loading")!.className = "hidden"
}

loadModels().then((_val) => {
    console.log("fetched models")
    renderModels()
    document.onkeydown = (ev) => {
        if (ev.ctrlKey || ev.metaKey || ev.altKey) {
            // ignore.
        }
        else if (ev.code == "KeyH") {
            respectHide = !respectHide
            renderModels()
            return false
        }
        else if (ev.code == "KeyR") {
            loadModels().then((_val) => renderModels())
            return false
        }
        return true
    }
})
