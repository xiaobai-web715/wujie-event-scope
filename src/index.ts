import { fnNameRegx, fnBody } from "./regx"
function patchElementHook(element: HTMLElement, window: Window) {
    const originHTMLClickEvent = element.onclick;
    if (typeof originHTMLClickEvent === 'function') {
        const originHTMLClickEventStr = originHTMLClickEvent.toString();
        console.log("===处理前信息", originHTMLClickEventStr)
        const replaceOriginHTMLClickEventStr = originHTMLClickEventStr.replace(fnNameRegx, (str) => {
            if (str.indexOf("window") > -1 || str.indexOf('onclick') > -1) {
                return str
            } else {
                return `window.${str}`
            }
        });
        console.log("===处理后信息", replaceOriginHTMLClickEventStr)
        const fnBodyStr = replaceOriginHTMLClickEventStr.match(fnBody)?.[1];
        if (fnBodyStr) {
            element.onclick = (function (window) {
                return function (event) {
                    const fn = new Function(fnBodyStr);
                    fn.call(this);
                }
            })(window)
        }
    }
}

export default {
    patchElementHook
};