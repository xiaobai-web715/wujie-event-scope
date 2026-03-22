import * as acorn from "acorn";
import * as walk from "acorn-walk";

export interface AstInfo {
  ast: string; // 目标字符
  start: number; // 开始偏移量
  end: number; // 结束偏移量
}

function getMemberExpressionPath(node: any): string {
  const object = node.object;
  const property = node.property;

  const objectName =
    object && object.type === "MemberExpression"
      ? getMemberExpressionPath(object)
      : object?.name;

  const propertyName =
    property && property.type === "MemberExpression"
      ? getMemberExpressionPath(property)
      : property?.name ?? property?.value ?? "";

  return `${objectName}.${propertyName}`;
}

function getCallExpression(node: any, args: any, results: Set<AstInfo>) {
  if (node.type === "Identifier") { 
    results.add({
      ast: node.name,
      start: node.start,
      end: node.end,
    });
    if (Array.isArray(args) && args.length > 0) {
      args.forEach((node: any) => {
        getCallExpression(node, node.arguments ,results)
      })
    }
  } else if (node.type === 'MemberExpression') {
    const memberName = getMemberExpressionPath(node);
    results.add({
      ast: memberName,
      start: node.start,
      end: node.end,
    });
  }
  return results
}

export function findIdentifiers(code: string) {
  const results = new Set<AstInfo>();

  const ast = acorn.parse(code, {
    ecmaVersion: "latest",
    sourceType: "module",
    locations: false,
    ranges: true,
  }) as any;

  walk.simple(ast, {
    CallExpression(node: any) {
      const callee = node.callee;

      if (!callee) return;

      getCallExpression(callee, node.arguments, results)
    },
    AssignmentExpression(node: any) {
      const left = node.left;

      if (!left) return;

      if (left.type === "Identifier") {
        results.add({
          ast: left.name,
          start: left.start,
          end: left.end,
        });
      }

      if (left.type === "MemberExpression") {
        const memberName = getMemberExpressionPath(left);
        results.add({
          ast: memberName,
          start: left.start,
          end: left.end,
        });
      }
    },
  });

  return Array.from(results).sort((a, b) => a.start - b.start);
}

/** 从解构等 Pattern 中收集绑定名（仅用于变量声明左侧） */
function collectPatternBindingIds(id: any, results: AstInfo[]): void {
  if (!id) return;
  // 普通声明：let a、const foo = 1、var bar
  if (id.type === "Identifier") {
    results.push({ ast: id.name, start: id.start, end: id.end });
    return;
  }
  // 对象解构左侧：const { x, y: z, ...rest } = obj
  if (id.type === "ObjectPattern") {
    for (const prop of id.properties) {
      if (prop.type === "Property") {
        collectPatternBindingIds(prop.value, results);
      } else if (prop.type === "RestElement") {
        collectPatternBindingIds(prop.argument, results);
      }
    }
    return;
  }
  // 数组解构左侧：const [a, b, , c] = arr
  if (id.type === "ArrayPattern") {
    for (const elt of id.elements) {
      if (elt) collectPatternBindingIds(elt, results);
    }
    return;
  }
  // 带默认值的解构项：const { x = 1 } = o 或 const [a = 0] = arr
  if (id.type === "AssignmentPattern") {
    collectPatternBindingIds(id.left, results);
  }
  // 剩余合并项解构赋值：const { ...rest } = o、const [a, ...tail] = arr
  if (id.type === "RestElement") {
    collectPatternBindingIds(id.argument, results);
  }
}

interface DeclarationWalkState {
  /** >0 表示在任意函数/箭头函数体内，其中的 var/赋值不会挂到 window */
  functionDepth: number;
  results: AstInfo[];
}

/**
 * 匹配会在全局（如浏览器 window）上产生「命名绑定」的写法（仅**脚本顶层**，不含嵌套函数体内）：
 * - 顶层函数声明名（如 `function onclick`）
 * - 顶层 var/let/const（含解构左侧）
 * - 顶层对裸标识符的简单赋值 `id = ...`
 *
 * 不包含：函数体内的声明、成员赋值 `a.b =`、复合赋值等。
 */
export function findDeclarationIdentifiers(code: string): string {
  const state: DeclarationWalkState = {
    functionDepth: 0,
    results: [],
  };

  const ast = acorn.parse(code, {
    ecmaVersion: "latest",
    sourceType: "module",
    ranges: true,
  }) as any;

  const visitors = walk.make(
    {
      Function(node: any, st: DeclarationWalkState, c) {
        if (
          node.type === "FunctionDeclaration" &&
          node.id &&
          st.functionDepth === 0
        ) {
          st.results.push({
            ast: node.id.name,
            start: node.id.start,
            end: node.id.end,
          });
        }
        st.functionDepth++;
        walk.base.Function!(node, st, c);
        st.functionDepth--;
      },
      VariableDeclaration(node: any, st: DeclarationWalkState, c) {
        if (st.functionDepth === 0) {
          for (const decl of node.declarations) {
            collectPatternBindingIds(decl.id, st.results);
          }
        }
        walk.base.VariableDeclaration!(node, st, c);
      },
      AssignmentExpression(node: any, st: DeclarationWalkState, c) {
        if (
          st.functionDepth === 0 &&
          node.operator === "=" &&
          node.left?.type === "Identifier"
        ) {
          st.results.push({
            ast: node.left.name,
            start: node.left.start,
            end: node.left.end,
          });
        }
        walk.base.AssignmentExpression!(node, st, c);
      },
    },
    walk.base,
  );

  walk.recursive(ast, state, visitors);

  return state.results.reduce((pv, { ast }) => {
    return `${pv}window.${ast}=${ast};`;
  }, "");
}