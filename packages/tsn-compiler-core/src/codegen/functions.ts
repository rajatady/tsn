import * as ts from 'typescript'

import type { ParamAlias, ParamInfo, StructField } from './types.js'

export interface FunctionPlanningContext {
  exprType(node: ts.Node): string | undefined
  tsTypeName(typeNode: ts.TypeNode | undefined): string
  tsTypeNameToC(tsType: string, fallback?: string): string
  getStructFields(name: string): StructField[] | undefined
  unwrapParens<T extends ts.Node>(node: T): ts.Node
}

export function inferFunctionReturnType(
  ctx: FunctionPlanningContext,
  node: ts.FunctionDeclaration,
): { tsType: string; cType: string } {
  if (node.type) {
    const tsType = ctx.tsTypeName(node.type)
    return { tsType, cType: ctx.tsTypeNameToC(tsType, 'void') }
  }

  let inferred = 'void'
  const visit = (child: ts.Node): void => {
    if (inferred !== 'void') return
    if (ts.isReturnStatement(child) && child.expression) {
      const expr = ctx.unwrapParens(child.expression)
      if (ts.isJsxElement(expr) || ts.isJsxSelfClosingElement(expr) || ts.isJsxFragment(expr)) {
        inferred = 'JSX.Element'
        return
      }
      inferred = ctx.exprType(expr) ?? 'void'
      return
    }
    ts.forEachChild(child, visit)
  }
  if (node.body) visit(node.body)
  return { tsType: inferred, cType: ctx.tsTypeNameToC(inferred, 'void') }
}

export function describeParameter(
  ctx: FunctionPlanningContext,
  p: ts.ParameterDeclaration,
  index: number,
): ParamInfo {
  const tsType = ctx.tsTypeName(p.type)
  const cType = ctx.tsTypeNameToC(tsType)
  const name = ts.isIdentifier(p.name) ? p.name.text : `_arg${index}`
  const aliases: ParamAlias[] = []

  if (ts.isObjectBindingPattern(p.name)) {
    const fields = ctx.getStructFields(tsType) ?? []
    for (const elem of p.name.elements) {
      const aliasName = elem.name.getText()
      const propName = elem.propertyName ? elem.propertyName.getText() : aliasName
      const field = fields.find(f => f.name === propName)
      aliases.push({
        name: aliasName,
        tsType: field?.tsType ?? 'number',
        cType: field?.cType ?? 'double',
        accessExpr: `${name}.${propName}`,
      })
    }
  }

  return { name, tsType, cType, aliases }
}
