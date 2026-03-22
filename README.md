# wujie-event-scope

在无界（wujie）子应用沙箱中，内联 HTML 事件（如 `onclick`）里的代码往往默认指向**宿主全局 `window`**，访问子应用里挂载的变量或 API 时容易出现 **`undefined` 或跑错环境**。本库在**不改业务写法**的前提下，把事件函数字符串改写为在**子应用代理 `window`** 上执行。

## 目标

- 让 **`onclick` 属性** 与 **`element.onclick` 函数 toString** 两类来源的事件逻辑，在运行时使用的 `window` 与无界子应用一致。
- 通过 **IIFE 形参遮蔽**：`(function(window) { … })(window.__WUJIE_xxx)`，使补丁生成的 `window.xxx` 指向传入的代理，而不是宿主全局。

## 工作原理（简要）

1. **解析**：用 [Acorn](https://github.com/acornjs/acorn) 遍历事件代码字符串，收集需要挂到全局上的标识符（主要为**调用 callee**、**赋值左侧**等，见 `findIdentifiers`）。
2. **改写**：对未包含 `window` 子串的片段前缀 `window.`，把裸标识访问改为 `window.xxx`（与无界子应用全局对齐）。
3. **子应用 `window` 注入**：
   - 首次处理某个子应用 `Window` 时，读取 `targetWindow.__WUJIE.id`，生成宿主上的全局路径 `__WUJIE_<规范化后的 id>`（字母数字大写，见 `targetToLNU`），并执行 `window[路径] = targetWindow`。
   - 路径缓存在 `WeakMap<Window, string>`（`elementDataStore`），同一子应用只注册一次。
4. **回写**：将 `onclick` 设为  
   `(function(window) { <改写后的函数体> })(window.__WUJIE_xxx)`，点击时由浏览器执行字符串，实参为已挂在宿主上的子应用代理。

## 使用

```ts
import wujieEventScope from "wujie-event-scope";

// 在子应用环境中拿到当前子应用的 window（代理），对需要修复的 DOM 调用：
wujieEventScope.patchElementHook(domElement, subAppWindow);
```

**前提**：子应用 `Window` 上存在无界提供的 `__WUJIE.id`，用于生成稳定的全局路径名。

## 构建

```bash
npm install
npm run build
```

产物：`dist/index.cjs.js`、`dist/index.es.js` 及类型声明。

## 限制与注意

- **覆盖范围**：当前改写主要针对 AST 中扫描到的调用/赋值等位置，并非任意位置的标识符；`!ast.includes('window')` 为启发式判断，极端写法可能漏改或误跳过。
- **`element.onclick` 路径**：从 `function … () { … }` 字符串中用正则抽取函数体（`fnBody`），复杂嵌套或非 `function` 声明可能不稳定。
- **安全**：本质仍是执行字符串化后的用户代码；不可信输入场景需配合 CSP、白名单等治理，不能单靠本库视为「安全沙箱」。
- **多子应用**：通过 `__WUJIE.id` 区分，每个子应用对应宿主上一个 `window.__WUJIE_<…>` 槽位。

## License

ISC
