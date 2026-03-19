import { fnBody } from "./regx"
import { findIdentifiers } from "./babelParse"
function patchElementHook(element: HTMLElement, window: Window) {
    const originHTMLClickEvent = element.onclick;
    if (typeof originHTMLClickEvent === 'function') {
        const originHTMLClickEventStr = originHTMLClickEvent.toString();
        console.log("====事件函数原字符", originHTMLClickEventStr)
        const targetAttrLists = findIdentifiers(originHTMLClickEventStr);
        let lastSliceEnd = 0;
        let replaceHTMLClickEventStr: string = '';
        targetAttrLists.forEach(astInfo => {
            const { ast, start, end } = astInfo
            if (!ast.includes('window')) {
                replaceHTMLClickEventStr += `${originHTMLClickEventStr.slice(lastSliceEnd, start)}window.${ast}`
                lastSliceEnd = end
            }
        })
        replaceHTMLClickEventStr += `${originHTMLClickEventStr.slice(lastSliceEnd)}`
        console.log("====事件函数处理后字符", replaceHTMLClickEventStr)
        const fnBodyStr = replaceHTMLClickEventStr.match(fnBody)?.[1];
        console.log("====匹配后字符", fnBodyStr)
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