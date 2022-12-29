

class StoredVal<T> {
    key: string
    _storage: T
    _convertForSave: ((storage: T) => any) | null = null
    _convertForLoad: ((jsonVal: any) => T) | null = null

    constructor(key: string, defaultVal: T, 
                convertForSave: ((storage: T) => any) | null = null,
                convertForLoad: ((jsonVal: any) => T) | null = null) {
        this.key = key
        this._convertForSave = convertForSave
        this._convertForLoad = convertForLoad

        var jsonVal = localStorage.getItem(key)
        if (jsonVal != null) {
            this._storage = JSON.parse(jsonVal)["data"]
            if (this._storage == undefined) {
                this._storage = defaultVal
            }
            else if (this._convertForLoad != null) {
                this._storage = this._convertForLoad(this._storage)
            }
        }
        else {
            this._storage = defaultVal
        }
    }

    get(): T {
        return this._storage
    }

    save() {
        var toStore: any
        if (this._convertForSave != undefined) {
            toStore = this._convertForSave(this._storage)
        }
        else {
            toStore = this._storage
        }
        localStorage.setItem(this.key, JSON.stringify({'data': toStore}))
    }
    
}

export { StoredVal }
