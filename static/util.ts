function sort(objects): any[] {
    // javascript sort behavior is ascii, even when used against numbers. use 
    // number-appropriate sort here.
    objects = Array.from(objects) as any[]
    var isNumber = false
    if (objects.length > 0) {
        isNumber = (typeof objects[0] == 'number')
    }

    var sorted: Object[]
    if (isNumber) {
        sorted = (objects as Array<number>).sort((a: number, b: number) => a - b)
    }
    else {
        sorted = objects.sort()
    }
    return sorted
}

function createElement(type: string, props = {}, withText = ""): HTMLElement {
    var elem = document.createElement(type)
    for (const prop in props) {
        elem.setAttribute(prop, props[prop])
    }
    if (withText) {
        elem.textContent = withText
    }
    return elem
}

export { sort, createElement }
