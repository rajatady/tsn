import * as ts from 'typescript'

import type { FuncSig } from '../../tsn-compiler-ui/src/types.js'
import type { ClassDef, StructDef, StructField } from './types.js'

export interface InferenceContext {
  structs: StructDef[]
  funcSigs: Map<string, FuncSig>
  varTypes: Map<string, string>
  classDefs: Map<string, ClassDef>
  currentClass: string | null
  tsTypeName(typeNode: ts.TypeNode | undefined): string
  tsTypeToC(typeNode: ts.TypeNode | undefined, fallback?: string): string
  arrayTypeName(innerTsType: string): string
  ensureMonomorphized(baseName: string, typeArg: string): string
  monomorphizeName(baseName: string, typeArg: string): string
  exprType(node: ts.Node): string | undefined
  unwrapParens<T extends ts.Node>(node: T): ts.Node
}

export function inferVarType(
  ctx: InferenceContext,
  decl: ts.VariableDeclaration,
): string {
  if (!decl.initializer) return 'double'
  const tsType = ctx.exprType(decl.initializer)
  if (tsType === 'string') return 'Str'
  if (tsType === 'number') return 'double'
  if (tsType === 'boolean') return 'bool'
  if (tsType?.endsWith('[]')) return ctx.arrayTypeName(tsType.replace('[]', ''))
  if (tsType && ctx.classDefs.has(tsType)) return `${tsType} *`
  if (tsType && ctx.structs.some(s => s.name === tsType)) return tsType

  if (ts.isCallExpression(decl.initializer)) {
    const fnName = decl.initializer.expression.getText()
    const sig = ctx.funcSigs.get(fnName)
    if (sig) {
      const rt = sig.returnCType
      return rt.startsWith('struct ') ? rt.replace('struct ', '') : rt
    }
  }

  if (ts.isNewExpression(decl.initializer)) {
    const name = decl.initializer.expression.getText()
    if (decl.initializer.typeArguments?.length) {
      const arg = ctx.tsTypeName(decl.initializer.typeArguments[0])
      const mono = ctx.ensureMonomorphized(name, arg)
      return `${mono} *`
    }
    if (ctx.classDefs.has(name)) return `${name} *`
  }

  return 'double'
}

export function inferVarTsType(
  ctx: InferenceContext,
  decl: ts.VariableDeclaration,
): string {
  if (!decl.initializer) return 'number'

  if (ts.isNewExpression(decl.initializer)) {
    const name = decl.initializer.expression.getText()
    if (decl.initializer.typeArguments?.length) {
      const arg = ctx.tsTypeName(decl.initializer.typeArguments[0])
      return ctx.ensureMonomorphized(name, arg)
    }
    return name
  }

  const tsType = ctx.exprType(decl.initializer)
  if (tsType) return tsType

  if (ts.isCallExpression(decl.initializer)) {
    const fnName = decl.initializer.expression.getText()
    const sig = ctx.funcSigs.get(fnName)
    if (sig) return sig.returnType
  }

  return 'number'
}

export function unwrapParens<T extends ts.Node>(node: T): ts.Node {
  let current: ts.Node = node
  while (ts.isParenthesizedExpression(current)) current = current.expression
  return current
}

export function emitInterface(
  ctx: InferenceContext,
  node: ts.InterfaceDeclaration,
): void {
  const name = node.name.text
  const fields: StructField[] = []
  for (const member of node.members) {
    if (ts.isPropertySignature(member) && member.name) {
      const fieldName = member.name.getText()
      const tsType = ctx.tsTypeName(member.type)
      const cType = ctx.tsTypeToC(member.type)
      fields.push({ name: fieldName, tsType, cType })
    }
  }
  ctx.structs.push({ name, fields })
}

export function exprType(
  ctx: InferenceContext,
  originalNode: ts.Node,
): string | undefined {
  const node = ctx.unwrapParens(originalNode)
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node)) return 'string'
  if (ts.isNumericLiteral(node)) return 'number'
  if (node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword) return 'boolean'
  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) return 'JSX.Element'
  if (ts.isIdentifier(node)) return ctx.varTypes.get(node.text)

  if (node.kind === ts.SyntaxKind.ThisKeyword && ctx.currentClass) return ctx.currentClass

  if (ts.isNewExpression(node)) {
    const name = node.expression.getText()
    if (node.typeArguments?.length) {
      const arg = ctx.tsTypeName(node.typeArguments[0])
      return ctx.monomorphizeName(name, arg)
    }
    return name
  }

  if (ts.isCallExpression(node)) {
    if (ts.isIdentifier(node.expression)) {
      // Async builtin inference is intentionally explicit here for now.
      // Edge cases to revisit once real async lowering exists:
      // - Promise<Response> for fetch-like APIs
      // - Promise<void> propagation through async function return inference
      // - flattening/normalizing nested Promise types if source code produces
      //   them indirectly through wrappers
      const sig = ctx.funcSigs.get(node.expression.text)
      if (sig) return sig.returnType
      if (node.expression.text === 'String') return 'string'
      if (node.expression.text === 'parseFloat' || node.expression.text === 'parseInt') return 'number'
      if (node.expression.text === 'readFile') return 'string'
      if (node.expression.text === 'readFileAsync') return 'Promise<string>'
      if (node.expression.text === 'writeFileAsync') return 'Promise<void>'
      if (node.expression.text === 'appendFileAsync') return 'Promise<void>'
      if (node.expression.text === 'listDir') return 'string[]'
      if (node.expression.text === 'listDirAsync') return 'Promise<string[]>'
      if (node.expression.text === 'fileExists') return 'boolean'
      if (node.expression.text === 'fileExistsAsync') return 'Promise<boolean>'
      if (node.expression.text === 'fileSize') return 'number'
      if (node.expression.text === 'fileSizeAsync') return 'Promise<number>'
      if (node.expression.text === 'exec') return 'number'
      if (node.expression.text === 'execAsync') return 'Promise<number>'
    }

    if (ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name.text
      if (ts.isIdentifier(node.expression.expression) && node.expression.expression.text === 'Math') return 'number'
      if (ts.isIdentifier(node.expression.expression) && node.expression.expression.text === 'Cpu') return 'number'
      if (ts.isIdentifier(node.expression.expression) && node.expression.expression.text === 'Mem') return 'number'

      const callObjType = ctx.exprType(node.expression.expression)
      if (callObjType && ctx.classDefs.has(callObjType)) {
        const cls = ctx.classDefs.get(callObjType)
        const classMethod = cls?.methods.find(x => x.name === method)
        if (classMethod) return classMethod.returnTsType
      }

      if (method === 'filter' || method === 'slice' || method === 'sort') return ctx.exprType(node.expression.expression)
      if (method === 'map' && node.arguments.length > 0) {
        const fn = node.arguments[0]
        if (ts.isArrowFunction(fn) && fn.parameters.length > 0) {
          const arrType = ctx.exprType(node.expression.expression)
          const innerType = arrType?.endsWith('[]') ? arrType.replace('[]', '') : 'number'
          const paramName = fn.parameters[0].name.getText()
          const prev = ctx.varTypes.get(paramName)
          ctx.varTypes.set(paramName, innerType)
          const bodyType = ts.isBlock(fn.body)
            ? (() => {
                const ret = fn.body.statements.find(s => ts.isReturnStatement(s)) as ts.ReturnStatement | undefined
                return ret?.expression ? (ctx.exprType(ret.expression) ?? 'number') : 'number'
              })()
            : (ctx.exprType(fn.body) ?? 'number')
          if (prev) ctx.varTypes.set(paramName, prev)
          else ctx.varTypes.delete(paramName)
          return bodyType + '[]'
        }
        return 'number[]'
      }
      if (method === 'reduce' && node.arguments.length >= 2) {
        return ctx.exprType(node.arguments[1]) ?? 'number'
      }
      if (method === 'forEach') return 'void'
      if (method === 'split') return 'string[]'
      if (method === 'trim' || method === 'trimStart' || method === 'trimEnd' || method === 'join' || method === 'toLowerCase' || method === 'toUpperCase') return 'string'
      if (method === 'indexOf' || method === 'findIndex' || method === 'count' || method === 'sum' || method === 'min' || method === 'max' || method === 'charCodeAt') return 'number'
      if (method === 'includes' || method === 'startsWith' || method === 'endsWith' || method === 'some' || method === 'every') return 'boolean'
    }
  }

  if (ts.isPropertyAccessExpression(node)) {
    if (node.name.text === 'length') return 'number'
    const objectType = ctx.exprType(node.expression)
    if (objectType) {
      if (ctx.classDefs.has(objectType)) {
        const cls = ctx.classDefs.get(objectType)
        const classField = cls?.fields.find(x => x.name === node.name.text)
        if (classField) return classField.tsType
      }
      const struct = ctx.structs.find(x => x.name === objectType)
      if (struct) {
        const field = struct.fields.find(x => x.name === node.name.text)
        if (field) return field.tsType
      }
    }
  }

  if (ts.isBinaryExpression(node)) {
    const op = node.operatorToken.kind
    if (op === ts.SyntaxKind.PlusToken) {
      if (ctx.exprType(node.left) === 'string' || ctx.exprType(node.right) === 'string') return 'string'
      return 'number'
    }
    if ([ts.SyntaxKind.MinusToken, ts.SyntaxKind.AsteriskToken, ts.SyntaxKind.SlashToken, ts.SyntaxKind.PercentToken].includes(op)) return 'number'
    if ([ts.SyntaxKind.LessThanToken, ts.SyntaxKind.GreaterThanToken, ts.SyntaxKind.LessThanEqualsToken, ts.SyntaxKind.GreaterThanEqualsToken, ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(op)) return 'boolean'
  }

  if (ts.isElementAccessExpression(node)) {
    const arrayType = ctx.exprType(node.expression)
    if (arrayType?.endsWith('[]')) return arrayType.slice(0, -2)
  }

  return undefined
}
