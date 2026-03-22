declare function setStoreData(window: Window, path: string): void;
declare function getStoreData(window: Window): string | undefined;
declare function hasStoreData(window: Window): boolean;
declare const _default: {
    store: WeakMap<Window, string>;
    setStoreData: typeof setStoreData;
    getStoreData: typeof getStoreData;
    hasStoreData: typeof hasStoreData;
};
export default _default;
//# sourceMappingURL=elementDataStore.d.ts.map