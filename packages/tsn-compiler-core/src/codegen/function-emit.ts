import * as ts from 'typescript'

import type { FuncSig } from './func_sig.js'
import { emitAsyncFunction } from './async-state-machine.js'
import { isAsyncFunction } from './async-lowering.js'
import type { ParamInfo } from './types.js'

export interface FunctionEmitContext {
  funcSigs: Map<string, FuncSig>
  functions: string[]
  funcLocalVars: Map<string, string>
  funcTopLevelVars: Set<string>
  funcDeclaredSoFar: Set<string>
  activeTryFrames: string[]
  identifierAliases: Map<string, string>
  varTypes: Map<string, string>
  indent: number
  currentFunctionReturnTsType: string | null
  currentFunctionIsAsync: boolean
  currentCatchTarget: { label: string; errorVar: string } | null
  inferFunctionReturnType(node: ts.FunctionDeclaration): { tsType: string; cType: string }
  describeParameter(p: ts.ParameterDeclaration, index: number): ParamInfo
  tsTypeName(typeNode: ts.TypeNode | undefined): string
  tsTypeNameToC(tsType: string, fallback?: string): string
  tsTypeToC(typeNode: ts.TypeNode | undefined, fallback?: string): string
  inferVarType(decl: ts.VariableDeclaration): string
  inferVarTsType(decl: ts.VariableDeclaration): string
  emitExpr(node: ts.Node): string
  exprType(node: ts.Node): string | undefined
  arrayCElemType(tsType: string): string
  withStmtSink<T>(sink: string[], fn: () => T): T
  pad(): string
  emitStmt(node: ts.Node, out: string[]): void
  srcLine(node: ts.Node): string
}

export function emitFunction(ctx: FunctionEmitContext, node: ts.FunctionDeclaration): void {
  if (!node.name) return
  if (!node.body) return
  if (emitAsyncFunction(ctx, node)) return
  const name = node.name.text

  if (name === 'readStdin') {
    ctx.funcSigs.set('readStdin', { name, params: [], returnType: 'string', returnCType: 'Str' })
    ctx.functions.push('Str readStdin(void) {\n    OwnedStr o = read_stdin();\n    return str_from(o.data, o.len);\n}')
    return
  }

  ctx.funcLocalVars.clear()
  ctx.funcTopLevelVars.clear()
  ctx.funcDeclaredSoFar.clear()
  ctx.identifierAliases.clear()

  const retInfo = ctx.inferFunctionReturnType(node)
  const retCType = retInfo.cType
  const retType = retInfo.tsType
  const asyncFn = isAsyncFunction(node)
  const params: FuncSig['params'] = []
  const paramStrs: string[] = []
  const paramInfos = node.parameters.map((p, index) => ctx.describeParameter(p, index))
  for (let i = 0; i < paramInfos.length; i++) {
    const info = paramInfos[i]
    const paramDecl = node.parameters[i]
    const defaultExpr = paramDecl.initializer ? ctx.emitExpr(paramDecl.initializer) : undefined
    params.push({ name: info.name, tsType: info.tsType, cType: info.cType, defaultExpr })
    paramStrs.push(`${info.cType} ${info.name}`)
    ctx.varTypes.set(info.name, info.tsType)
    for (const alias of info.aliases) ctx.varTypes.set(alias.name, alias.tsType)
  }
  ctx.funcSigs.set(name, { name, params, returnType: retType, returnCType: retCType })

  for (const s of node.body.statements) {
    if (ts.isVariableStatement(s)) {
      for (const d of s.declarationList.declarations) {
        if (ts.isIdentifier(d.name)) ctx.funcTopLevelVars.add(d.name.text)
      }
    }
  }

  const body: string[] = []
  ctx.withStmtSink(body, () => {
    ctx.currentFunctionReturnTsType = retType
    ctx.currentFunctionIsAsync = asyncFn
    ctx.currentCatchTarget = null
    ctx.activeTryFrames.length = 0
    ctx.indent = 1
    for (const info of paramInfos) {
      for (const alias of info.aliases) {
        body.push(ctx.pad() + `${alias.cType} ${alias.name} = ${alias.accessExpr};`)
      }
    }
    for (const s of node.body!.statements) ctx.emitStmt(s, body)
    if (asyncFn && retType === 'Promise<void>') {
      body.push(ctx.pad() + `return ${retCType}_resolved();`)
    }
    ctx.indent = 0
    ctx.currentCatchTarget = null
    ctx.activeTryFrames.length = 0
    ctx.currentFunctionReturnTsType = null
    ctx.currentFunctionIsAsync = false
  })
  const ps = paramStrs.length ? paramStrs.join(', ') : 'void'
  const fnLine = ctx.srcLine(node)
  ctx.functions.push(`${fnLine}${retCType} ${name}(${ps}) {\n${body.join('\n')}\n}`)
}
