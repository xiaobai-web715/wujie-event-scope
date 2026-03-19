import { parse } from "@babel/parser"
import traverse from "@babel/traverse"

export interface AstInfo {
    ast: string, // 目标字符
    start: number, // 开始偏移量
    end: number, // 结束偏移量
}
function getMemberExpressionPath(path: any): string {
    const object = path.get('object');
    const property = path.get('property');
    return `${object.isMemberExpression() ? getMemberExpressionPath(object) : object.node.name}.${property.isMemberExpression() ? getMemberExpressionPath(property) : property.node.name}`
}

export function findIdentifiers(code: string) {
    const results = new Set<AstInfo>();
    const ast = parse(code, {
        sourceType: 'module'
    });
    // @ts-ignore
    (traverse.default ? traverse.default : traverse)(ast, {
        CallExpression(path: any) {
            const callee = path.get('callee');
            if (callee.isIdentifier()) {
                results.add({
                    ast: callee.node.name,
                    start: callee.node.start,
                    end: callee.node.end
                });
            }
            if (callee.isMemberExpression()) {
                const memberName = getMemberExpressionPath(callee);
                results.add({
                    ast: memberName,
                    start: callee.node.start,
                    end: callee.node.end
                });
            }
        },
        AssignmentExpression(path: any) {
            const left = path.get('left');
            if (left.isIdentifier()) {
                results.add({
                    ast: left.node.name,
                    start: left.node.start,
                    end: left.node.end
                }); // d
            }
        
            if (left.isMemberExpression()) {
                const memberName = getMemberExpressionPath(left);
                results.add({
                    ast: memberName,
                    start: left.node.start,
                    end: left.node.end
                });
            }
        }
    })

    return Array.from(results);
}