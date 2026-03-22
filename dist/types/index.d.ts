interface IpatchInlineCodeHook {
    code: string;
}
declare function patchElementHook(element: HTMLElement, targetWindow: Window): void;
declare function patchInlineCodeHook(target: IpatchInlineCodeHook, targetWindow: Window): void;
declare const _default: {
    patchElementHook: typeof patchElementHook;
    patchInlineCodeHook: typeof patchInlineCodeHook;
};
export default _default;
//# sourceMappingURL=index.d.ts.map