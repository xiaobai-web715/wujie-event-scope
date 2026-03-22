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
      // if (callee.type === "Identifier") {
      //   results.add({
      //     ast: callee.name,
      //     start: callee.start,
      //     end: callee.end,
      //   });
      //   if (Array.isArray(node.arguments) && node.arguments.length > 0) {
      //     node.arguments.forEach((node: any) => {
      //       if (node.type === 'Identifier') {
      //         results.add({
      //           ast: node.name,
      //           start: node.start,
      //           end: node.end,
      //         });
      //       } else if (node.type === 'MemberExpression') {
      //         const memberName = getMemberExpressionPath(callee);
      //         results.add({
      //           ast: memberName,
      //           start: node.start,
      //           end: node.end,
      //         });
      //       }
      //     })
      //   }
      // }

      // if (callee.type === "MemberExpression") {
      //   const memberName = getMemberExpressionPath(callee);
      //   results.add({
      //     ast: memberName,
      //     start: callee.start,
      //     end: callee.end,
      //   });
      // }
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