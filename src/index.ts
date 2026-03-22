import { fnBody } from "./regx"
import { targetToLNU } from "./utils"
import { findIdentifiers, findDeclarationIdentifiers } from "./babelParse"
import elementDataStore from "./elementDataStore"

interface IpatchInlineCodeHook {
    code: string
}

function dealAttributesOCPatch(targetString: string) {
    const targetAttrLists = findIdentifiers(targetString);
    let lastSliceEnd = 0;
    let replaceAttributeEventStr: string = '';
    targetAttrLists.forEach(astInfo => {
        const { ast, start, end } = astInfo
        if (!ast.includes('window')) {
            replaceAttributeEventStr += `${targetString.slice(lastSliceEnd, start)}window.${ast}`
            lastSliceEnd = end
        }
    })
    replaceAttributeEventStr += `${targetString.slice(lastSliceEnd)}`
    // console.log("====事件函数处理后字符", replaceAttributeEventStr)
    return replaceAttributeEventStr
}

function dealHTMLOCPatch(targetString: string) {
        // console.log("====事件函数原字符", targetString)
        const targetAttrLists = findIdentifiers(targetString);
        let lastSliceEnd = 0;
        let replaceHTMLClickEventStr: string = '';
        targetAttrLists.forEach(astInfo => {
            const { ast, start, end } = astInfo
            if (!ast.includes('window')) {
                replaceHTMLClickEventStr += `${targetString.slice(lastSliceEnd, start)}window.${ast}`
                lastSliceEnd = end
            }
        })
        replaceHTMLClickEventStr += `${targetString.slice(lastSliceEnd)}`
        // console.log("====事件函数处理后字符", replaceHTMLClickEventStr)
        const fnBodyStr = replaceHTMLClickEventStr.match(fnBody)?.[1];
        return fnBodyStr || ''
}

function patchElementHook(element: HTMLElement, targetWindow: Window) {
    const targetHaveGetAttribute = typeof element.getAttribute === 'function'
    const originHTMLClickEvent = element.onclick;
    const originAttributeEventStr = targetHaveGetAttribute ? element.getAttribute('onclick') : ''
    // if (targetHaveGetAttribute && element.getAttribute('data-test-scope')) {
    //     console.log('===HTML事件绑定', originHTMLClickEvent)
    //     console.log('===attribute获取事件', originAttributeEventStr)
    // }
    let result = '';
    if (originAttributeEventStr) {
        result = dealAttributesOCPatch(originAttributeEventStr)
    } else if (typeof originHTMLClickEvent === 'function') {
        result = dealHTMLOCPatch(originHTMLClickEvent.toString())
    }
    if (result) {
        // console.log("====执行字符串", result)
        const haveRegister = elementDataStore.hasStoreData(targetWindow)
        if(!haveRegister) {
            // @ts-ignore
            const currentWujieName = targetWindow.__WUJIE.id
            const targetWindowPath = `__WUJIE_${targetToLNU(currentWujieName)}`
            // console.log("===存储路径", targetWindowPath)
            // @ts-ignore
            window[targetWindowPath] = targetWindow
            elementDataStore.setStoreData(targetWindow, targetWindowPath)
        }
        const targetWindowPath = elementDataStore.getStoreData(targetWindow)
        element.setAttribute('onclick', `(function(window) {
            ${result}
        })(window.${targetWindowPath})`)
        // console.log("===替换之后的结果", element.getAttribute('onclick'))
    }
}

function patchInlineCodeHook(target: IpatchInlineCodeHook, targetWindow: Window) {
    const result = findDeclarationIdentifiers(target.code)
    console.log("===处理后的信息", result)
    target.code = result
}

export default {
    patchElementHook,
    patchInlineCodeHook
};