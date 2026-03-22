# wujie-event-scope

在无界（wujie）子应用沙箱中，内联 HTML 事件（如 `onclick`）里的代码往往默认指向**宿主全局 `window`**，访问子应用里挂载的变量或 API 时容易出现 **`undefined` 或跑错环境**。本库在**不改业务写法**的前提下，把事件函数字符串改写为在**子应用代理 `window`** 上执行。

## 目标

- 让 **`onclick` 属性** 与 **`element.onclick` 函数 toString** 两类来源的事件逻辑，在运行时使用的 `window` 与无界子应用一致。
- 通过 **IIFE 形参遮蔽**：`(function(window) { … })(window.__WUJIE_xxx)`，使补丁里出现的 `window.xxx` 指向传入的代理，而不是宿主全局。
- 对**函数声明、变量声明、以及裸标识符的简单赋值**（如 `obj = {}`）等会在全局产生「名字」的写法，额外生成 **`window.名字 = 名字`**，把这些绑定同步到形参 `window`（子应用代理）上，避免只在局部存在、代理上读不到的问题。

## 工作原理（简要）

1. **表达式侧改写**（`findIdentifiers`）  
   用 [Acorn](https://github.com/acornjs/acorn) 遍历代码，收集**调用 callee**、**赋值左侧**等位置；对未包含 `window` 子串的片段前缀 `window.`，把对全局的访问改写成 `window.xxx`，与 IIFE 内形参 `window` 一致。

2. **声明 / 隐式全局绑定同步**（`findDeclarationIdentifiers`）  
   单独扫描**函数声明**、**变量声明**（含解构左侧）、以及 **`id = …` 且左侧为裸标识符**的简单赋值（脚本语义下会挂到全局对象上的名字）。  
   对每个收集到的名字 `x`，生成一段 **`window.x = x;`** 拼接进最终可执行字符串。这样在 `(function(window) { … })` 里，先执行用户逻辑产生绑定，再把同名属性挂到**形参 `window`**（无界子应用代理）上，后续通过 `window.xxx` 的读写才能落在同一对象上。

3. **子应用 `window` 注入**
   - 首次处理某个子应用 `Window` 时，读取 `targetWindow.__WUJIE.id`，生成宿主上的全局路径 `__WUJIE_<规范化后的 id>`（字母数字大写，见 `targetToLNU`），并执行 `window[路径] = targetWindow`。
   - 路径缓存在 `WeakMap<Window, string>`（`elementDataStore`），同一子应用只注册一次。

4. **回写**  
   `patchElementHook` 会把改写后的函数体包进：  
   `(function(window) { … })(window.__WUJIE_xxx)`。  
   若还需要**声明同步**，请把 `findDeclarationIdentifiers` 返回的 `window.x=x;…` 串在函数体**前部**与经 `findIdentifiers` 处理后的正文拼在一起，再包进同一 IIFE（与无界注入路径一致）。

## 使用

```ts
import wujieEventScope from "wujie-event-scope";
```

通过 [WUJIE](https://wujie-micro.github.io/doc/api/preloadApp.html#plugins)提供的Plugins扩展使用

源码中可直接使用：

- `findIdentifiers`：表达式侧改写（`window.xxx` 前缀）。
- `findDeclarationIdentifiers`：返回 `window.x=x;` 形式的声明同步片段（见 `src/babelParse.ts`）。二者可按需组合

**前提**：子应用 `Window` 上存在无界提供的 `__WUJIE.id`，用于生成稳定的全局路径名。

## 构建

```bash
npm install
npm run build
```

产物：`dist/index.cjs.js`、`dist/index.es.js` 及类型声明。

## 限制与注意

- **覆盖范围**：`findIdentifiers` 只处理扫描到的调用/赋值等位置，并非任意标识符；`!ast.includes('window')` 为启发式判断，极端写法可能漏改或误跳过。
- **`findDeclarationIdentifiers`**：不包含成员赋值 `a.b =`、复合赋值、普通表达式里的标识符等；与「声明 / 裸 `x =`」语义对齐，复杂场景需自行扩展。
- **`element.onclick` 路径**：从 `function … () { … }` 字符串中用正则抽取函数体（`fnBody`），复杂嵌套或非 `function` 声明可能不稳定。
- **安全**：本质仍是执行字符串化后的用户代码；不可信输入场景需配合 CSP、白名单等治理，不能单靠本库视为「安全沙箱」。
- **多子应用**：通过 `__WUJIE.id` 区分，每个子应用对应宿主上一个 `window.__WUJIE_<…>` 槽位。

## License

ISC
