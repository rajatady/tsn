import * as ts from 'typescript'

import { emitThrownValue, type CatchTarget } from './exceptions.js'
import { isAsyncFunction, unwrapAwaitType } from './async-lowering.js'
import type { ParamInfo } from './types.js'

interface HoistedVar {
  name: string
  tsType: string
  cType: string
}

interface AwaitField {
  name: string
  promiseTsType: string
  promiseCType: string
}

export interface AsyncStateMachineContext {
  funcSigs: Map<string, import('../../tsn-compiler-ui/src/types.js').FuncSig>
  functions: string[]
  varTypes: Map<string, string>
  identifierAliases: Map<string, string>
  currentFunctionReturnTsType: string | null
  currentFunctionIsAsync: boolean
  currentCatchTarget: CatchTarget | null
  indent: number
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
  srcLine(node: ts.Node): string
}

function containsAwait(node: ts.Node | undefined): boolean {
  if (!node) return false
  let found = false
  const visit = (child: ts.Node): void => {
    if (found) return
    if (ts.isAwaitExpression(child)) {
      found = true
      return
    }
    ts.forEachChild(child, visit)
  }
  visit(node)
  return found
}

function collectHoistedVars(
  ctx: AsyncStateMachineContext,
  node: ts.Node,
  vars: Map<string, HoistedVar>,
): void {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
    if (!vars.has(node.name.text)) {
      const tsType = node.type ? ctx.tsTypeName(node.type) : ctx.inferVarTsType(node)
      const cType = node.type ? ctx.tsTypeToC(node.type) : ctx.inferVarType(node)
      vars.set(node.name.text, { name: node.name.text, tsType, cType })
    }
  }
  if (ts.isCatchClause(node) && node.variableDeclaration && ts.isIdentifier(node.variableDeclaration.name)) {
    return
  }
  ts.forEachChild(node, child => collectHoistedVars(ctx, child, vars))
}

function zeroValueFor(cType: string): string {
  if (cType === 'double') return '0'
  if (cType === 'bool') return 'false'
  if (cType === 'Str') return 'str_lit("")'
  if (cType.startsWith('Promise_')) return `${cType}_pending()`
  if (cType.endsWith('Arr')) return `${cType}_new()`
  return `(${cType}){0}`
}

function unwrap(node: ts.Expression): ts.Expression {
  while (ts.isParenthesizedExpression(node)) node = node.expression
  return node
}

export function emitAsyncFunction(ctx: AsyncStateMachineContext, node: ts.FunctionDeclaration): boolean {
  if (!node.name || !node.body || !isAsyncFunction(node)) return false

  const name = node.name.text
  const retInfo = ctx.inferFunctionReturnType(node)
  const retType = retInfo.tsType
  const retCType = retInfo.cType
  const innerTsType = unwrapAwaitType(retType) ?? 'void'
  const innerCType = innerTsType === 'void' ? 'void' : ctx.tsTypeNameToC(innerTsType, 'void')
  const resumeName = `${name}__resume`
  const frameName = `${name}__frame`
  const promiseField = '__promise'
  const stateField = '__state'
  const errorField = '__error'

  const params: Array<{ name: string; tsType: string; cType: string }> = []
  const paramStrs: string[] = []
  const paramInfos = node.parameters.map((p, index) => ctx.describeParameter(p, index))
  for (const info of paramInfos) {
    params.push({ name: info.name, tsType: info.tsType, cType: info.cType })
    paramStrs.push(`${info.cType} ${info.name}`)
  }
  ctx.funcSigs.set(name, { name, params, returnType: retType, returnCType: retCType })

  const hoisted = new Map<string, HoistedVar>()
  collectHoistedVars(ctx, node.body, hoisted)
  for (const info of paramInfos) {
    hoisted.set(info.name, { name: info.name, tsType: info.tsType, cType: info.cType })
  }

  const awaitFields: AwaitField[] = []
  let nextStateId = 1
  let indent = 1
  let currentCatchLabel: string | null = null

  const body: string[] = []
  const pad = () => '    '.repeat(indent)
  const push = (line: string) => body.push(pad() + line)

  const withAliases = <T>(fn: () => T): T => {
    const prevAliases = new Map(ctx.identifierAliases)
    const prevVarTypes = new Map(ctx.varTypes)
    for (const info of paramInfos) {
      ctx.varTypes.set(info.name, info.tsType)
    }
    for (const value of hoisted.values()) {
      ctx.identifierAliases.set(value.name, `frame->${value.name}`)
      ctx.varTypes.set(value.name, value.tsType)
    }
    for (const info of paramInfos) {
      for (const alias of info.aliases) {
        ctx.identifierAliases.set(alias.name, alias.accessExpr.replace(new RegExp(`\\b${info.name}\\b`, 'g'), `frame->${info.name}`))
        ctx.varTypes.set(alias.name, alias.tsType)
      }
    }
    const prevReturn = ctx.currentFunctionReturnTsType
    const prevAsync = ctx.currentFunctionIsAsync
    const prevCatch = ctx.currentCatchTarget
    ctx.currentFunctionReturnTsType = retType
    ctx.currentFunctionIsAsync = true
    ctx.currentCatchTarget = null
    try {
      return fn()
    } finally {
      ctx.identifierAliases.clear()
      for (const [k, v] of prevAliases) ctx.identifierAliases.set(k, v)
      ctx.varTypes.clear()
      for (const [k, v] of prevVarTypes) ctx.varTypes.set(k, v)
      ctx.currentFunctionReturnTsType = prevReturn
      ctx.currentFunctionIsAsync = prevAsync
      ctx.currentCatchTarget = prevCatch
    }
  }

  const finishResolve = (expr: string | null) => {
    if (innerTsType === 'void') {
      push(`${retCType}_resolve(frame->${promiseField});`)
    } else {
      push(`${retCType}_resolve(frame->${promiseField}, ${expr ?? zeroValueFor(innerCType)});`)
    }
    push('free(frame);')
    push('return;')
  }

  const finishReject = (errorExpr: string) => {
    push(`${retCType}_reject(frame->${promiseField}, ${errorExpr});`)
    push('free(frame);')
    push('return;')
  }

  const ensureAwaitField = (promiseTsType: string): AwaitField => {
    const field: AwaitField = {
      name: `__await${awaitFields.length}`,
      promiseTsType,
      promiseCType: ctx.tsTypeNameToC(promiseTsType, 'Promise_void'),
    }
    awaitFields.push(field)
    return field
  }

  const emitAwaitSequence = (
    awaitedExpr: ts.Expression,
    onValue: ((valueExpr: string | null) => void) | null,
  ) => {
    const promiseTsType = ctx.exprType(awaitedExpr)
    if (!promiseTsType || !promiseTsType.startsWith('Promise<')) {
      onValue?.(ctx.emitExpr(awaitedExpr))
      return
    }
    const field = ensureAwaitField(promiseTsType)
    const stateId = nextStateId++
    const inner = unwrapAwaitType(promiseTsType) ?? 'void'
    const rejectedHandler = currentCatchLabel
      ? [
          `${pad()}if (${field.promiseCType}_state(frame->${field.name}) == TS_PROMISE_REJECTED) {`,
          `${pad()}    frame->${errorField} = ${field.promiseCType}_error(frame->${field.name});`,
          `${pad()}    goto ${currentCatchLabel};`,
          `${pad()}}`,
        ]
      : [
          `${pad()}if (${field.promiseCType}_state(frame->${field.name}) == TS_PROMISE_REJECTED) {`,
          `${pad()}    ${retCType}_reject(frame->${promiseField}, ${field.promiseCType}_error(frame->${field.name}));`,
          `${pad()}    free(frame);`,
          `${pad()}    return;`,
          `${pad()}}`,
        ]

    push(`frame->${field.name} = ${ctx.emitExpr(awaitedExpr)};`)
    push(`if (${field.promiseCType}_state(frame->${field.name}) == TS_PROMISE_PENDING) {`)
    indent++
    push(`frame->${stateField} = ${stateId};`)
    push(`ts_promise_subscribe(frame->${field.name}.state, ${resumeName}, frame);`)
    push('return;')
    indent--
    push('}')
    body.push(`${pad()}case ${stateId}:;`)
    for (const line of rejectedHandler) body.push(line)
    if (inner === 'void') onValue?.(null)
    else onValue?.(`${field.promiseCType}_value(frame->${field.name})`)
  }

  const emitStmt = (stmt: ts.Statement): void => {
    const sl = ctx.srcLine(stmt)
    if (sl) body.push(sl.trimEnd())

    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name)) continue
        const target = `frame->${decl.name.text}`
        const cType = decl.type ? ctx.tsTypeToC(decl.type) : ctx.inferVarType(decl)
        if (!decl.initializer) {
          push(`${target} = ${zeroValueFor(cType)};`)
          continue
        }
        const init = unwrap(decl.initializer)
        if (ts.isAwaitExpression(init)) {
          emitAwaitSequence(init.expression, value => {
            if (value) push(`${target} = ${value};`)
          })
          continue
        }
        if (ts.isArrayLiteralExpression(init) && init.elements.length === 0 && cType.endsWith('Arr')) {
          push(`${target} = ${cType}_new();`)
          continue
        }
        push(`${target} = ${ctx.emitExpr(decl.initializer)};`)
      }
      return
    }

    if (ts.isExpressionStatement(stmt)) {
      const expr = stmt.expression
      if (ts.isAwaitExpression(expr)) {
        emitAwaitSequence(expr.expression, () => {})
        return
      }
      if (ts.isBinaryExpression(expr) && expr.right && ts.isAwaitExpression(unwrap(expr.right))) {
        const awaited = unwrap(expr.right) as ts.AwaitExpression
        const lhs = ctx.emitExpr(expr.left)
        const op = expr.operatorToken.getText()
        emitAwaitSequence(awaited.expression, value => {
          if (op === '=') push(`${lhs} = ${value};`)
          else push(`${lhs} ${op} ${value};`)
        })
        return
      }
      push(`${ctx.emitExpr(expr)};`)
      return
    }

    if (ts.isIfStatement(stmt)) {
      push(`if (${ctx.emitExpr(stmt.expression)}) {`)
      indent++
      emitBlock(stmt.thenStatement)
      indent--
      if (stmt.elseStatement) {
        if (ts.isIfStatement(stmt.elseStatement)) {
          push('} else')
          emitStmt(stmt.elseStatement)
        } else {
          push('} else {')
          indent++
          emitBlock(stmt.elseStatement)
          indent--
          push('}')
        }
      } else {
        push('}')
      }
      return
    }

    if (ts.isWhileStatement(stmt)) {
      push(`while (${ctx.emitExpr(stmt.expression)}) {`)
      indent++
      emitBlock(stmt.statement)
      indent--
      push('}')
      return
    }

    if (ts.isForStatement(stmt)) {
      let init = ''
      if (stmt.initializer && ts.isVariableDeclarationList(stmt.initializer)) {
        const parts: string[] = []
        for (const d of stmt.initializer.declarations) {
          if (!ts.isIdentifier(d.name)) continue
          parts.push(`frame->${d.name.text} = ${d.initializer ? ctx.emitExpr(d.initializer) : '0'}`)
        }
        init = parts.join(', ')
      } else if (stmt.initializer) {
        init = ctx.emitExpr(stmt.initializer)
      }
      push(`for (${init}; ${stmt.condition ? ctx.emitExpr(stmt.condition) : ''}; ${stmt.incrementor ? ctx.emitExpr(stmt.incrementor) : ''}) {`)
      indent++
      emitBlock(stmt.statement)
      indent--
      push('}')
      return
    }

    if (ts.isReturnStatement(stmt)) {
      if (!stmt.expression) {
        finishResolve(null)
        return
      }
      const expr = unwrap(stmt.expression)
      if (ts.isAwaitExpression(expr)) {
        emitAwaitSequence(expr.expression, value => finishResolve(value))
        return
      }
      const exprTsType = ctx.exprType(expr)
      if (exprTsType === retType) {
        emitAwaitSequence(expr, value => finishResolve(value))
        return
      }
      finishResolve(ctx.emitExpr(stmt.expression))
      return
    }

    if (ts.isThrowStatement(stmt) && stmt.expression) {
      const thrown = emitThrownValue(ctx, stmt.expression)
      if (currentCatchLabel) {
        push(`frame->${errorField} = ${thrown};`)
        push(`goto ${currentCatchLabel};`)
      } else {
        finishReject(thrown)
      }
      return
    }

    if (ts.isTryStatement(stmt) && stmt.catchClause) {
      const id = nextStateId++
      const catchLabel = `_ts_async_catch_${id}`
      const endLabel = `_ts_async_try_end_${id}`
      const prevCatch = currentCatchLabel
      currentCatchLabel = catchLabel
      push('{')
      indent++
      emitBlock(stmt.tryBlock)
      push(`goto ${endLabel};`)
      indent--
      body.push(`${catchLabel}: ;`)
      push('{')
      indent++
      const binding = stmt.catchClause.variableDeclaration?.name
      if (binding && ts.isIdentifier(binding)) {
        body.push(`${pad()}Str ${binding.text} = frame->${errorField};`)
      }
      emitBlock(stmt.catchClause.block)
      indent--
      push('}')
      body.push(`${endLabel}: ;`)
      push('}')
      currentCatchLabel = prevCatch
      return
    }

    if (ts.isBreakStatement(stmt)) {
      push('break;')
      return
    }
    if (ts.isContinueStatement(stmt)) {
      push('continue;')
      return
    }

    if (ts.isForOfStatement(stmt)) {
      const arrExpr = ctx.emitExpr(stmt.expression)
      let varName = '_item'
      if (ts.isVariableDeclarationList(stmt.initializer)) {
        const decl = stmt.initializer.declarations[0]
        if (ts.isIdentifier(decl.name)) varName = decl.name.text
      }
      const arrType = ctx.exprType(stmt.expression)
      const elemCType = ctx.arrayCElemType(arrType ?? 'number[]')
      const id = nextStateId++
      push(`for (int _i${id} = 0; _i${id} < ${arrExpr}.len; _i${id}++) {`)
      indent++
      body.push(`${pad()}${elemCType} ${varName} = ${arrExpr}.data[_i${id}];`)
      emitBlock(stmt.statement)
      indent--
      push('}')
      return
    }

    push(`/* UNSUPPORTED ASYNC STMT: ${ts.SyntaxKind[stmt.kind]} */`)
  }

  const emitBlock = (blockLike: ts.Node): void => {
    if (ts.isBlock(blockLike)) {
      for (const s of blockLike.statements) emitStmt(s)
      return
    }
    emitStmt(blockLike as ts.Statement)
  }

  withAliases(() => {
    body.push('switch (frame->__state) {')
    body.push('case 0:')
    indent = 1
    for (const stmt of node.body!.statements) emitStmt(stmt)
    if (innerTsType === 'void') finishResolve(null)
    else finishResolve(zeroValueFor(innerCType))
    body.push('default:')
    body.push('    return;')
    body.push('}')
  })

  const frameFields: string[] = [
    `    ${retCType} ${promiseField};`,
    `    int ${stateField};`,
    `    Str ${errorField};`,
  ]
  for (const value of hoisted.values()) {
    frameFields.push(`    ${value.cType} ${value.name};`)
  }
  for (const field of awaitFields) {
    frameFields.push(`    ${field.promiseCType} ${field.name};`)
  }

  ctx.functions.push(`typedef struct ${frameName} {\n${frameFields.join('\n')}\n} ${frameName};`)
  ctx.functions.push(`static void ${resumeName}(void *__userdata) {\n    ${frameName} *frame = (${frameName} *)__userdata;\n${body.join('\n')}\n}`)

  const startBody: string[] = []
  startBody.push(`    ${retCType} _promise = ${retCType}_pending();`)
  startBody.push(`    ${frameName} *frame = (${frameName} *)calloc(1, sizeof(${frameName}));`)
  startBody.push(`    if (frame == NULL) return ${retCType}_rejected(str_lit("async frame allocation failed"));`)
  startBody.push(`    frame->${promiseField} = _promise;`)
  startBody.push(`    frame->${stateField} = 0;`)
  startBody.push(`    frame->${errorField} = str_lit("");`)
  for (const info of paramInfos) {
    startBody.push(`    frame->${info.name} = ${info.name};`)
  }
  startBody.push(`    ${resumeName}(frame);`)
  startBody.push('    return _promise;')
  const ps = paramStrs.length ? paramStrs.join(', ') : 'void'
  const fnLine = ctx.srcLine(node)
  ctx.functions.push(`${fnLine}${retCType} ${name}(${ps}) {\n${startBody.join('\n')}\n}`)
  return true
}
