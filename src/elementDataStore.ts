const store = new WeakMap<Window, string>()
function setStoreData (window: Window, path: string) {
    store.set(window, path)
}
function getStoreData (window: Window) {
    return store.get(window)
}
function hasStoreData (window: Window) {
    return store.has(window)
}
export default {
    store,
    setStoreData,
    getStoreData,
    hasStoreData
}