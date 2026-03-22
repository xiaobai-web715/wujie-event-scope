export interface AstInfo {
    ast: string;
    start: number;
    end: number;
}
export declare function findIdentifiers(code: string): AstInfo[];
/**
 * 匹配会在全局（如浏览器 window）上产生「命名绑定」的写法（仅**脚本顶层**，不含嵌套函数体内）：
 * - 顶层函数声明名（如 `function onclick`）
 * - 顶层 var/let/const（含解构左侧）
 * - 顶层对裸标识符的简单赋值 `id = ...`
 *
 * 不包含：函数体内的声明、成员赋值 `a.b =`、复合赋值等。
 */
export declare function findDeclarationIdentifiers(code: string): string;
//# sourceMappingURL=babelParse.d.ts.map