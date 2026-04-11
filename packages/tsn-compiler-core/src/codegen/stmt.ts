import * as ts from 'typescript'

import { emitThrownValue, type CatchTarget } from './exceptions.js'
import type { ClassDef } from './types.js'

export interface HookBindingEmitter {
  tryEmitBindingDeclaration(decl: ts.VariableDeclaration, out: string[], pad: () => string): boolean
}

export interface StatementEmitterContext {
  hooks: HookBindingEmitter
  builderVars: Set<string>
  varTypes: Map<string, string>
  funcLocalVars: Map<string, string>
  funcTopLevelVars: Set<string>
  funcDeclaredSoFar: Set<string>
  activeTryFrames: string[]
  classDefs: Map<string, ClassDef>
  currentClass: string | null
  currentFunctionReturnTsType: string | null
  currentFunctionIsAsync: boolean
  currentCatchTarget: CatchTarget | null
  needsJsonParser: boolean
  jsonParseTargetType: string
  indent: number
  srcLine(node: ts.Node): string
  pad(): string
  tsTypeName(typeNode: ts.TypeNode | undefined): string
  tsTypeToC(typeNode: ts.TypeNode | undefined, fallback?: string): string
  inferVarType(decl: ts.VariableDeclaration): string
  inferVarTsType(decl: ts.VariableDeclaration): string
  emitExpr(node: ts.Node): string
  emitObjLit(node: ts.ObjectLiteralExpression, targetStructName?: string): string
  emitScopeCleanup(varsBefore: Set<string>, out: string[], block?: ts.Block): void
  getReleaseForType(varName: string, tsType: string): string[]
  detectBuilders(block: ts.Block): string[]
  isBuilderConcat(node: ts.BinaryExpression, varName: string): boolean
  flattenBuilderConcat(node: ts.BinaryExpression, varName: string, pieces: ts.Node[]): void
  extractCharSlice(node: ts.Node): { str: string; idx: string } | null
  exprType(node: ts.Node): string | undefined
  arrayTypeName(innerTsType: string): string
  arrayCElemType(tsType: string): string
  nextTempId(): number
  wrapAsyncReturn(expr: ts.Expression | null): string
  wrapAsyncThrow(errorExpr: string): string
}

export function emitStmt(ctx: StatementEmitterContext, node: ts.Node, out: string[]): void {
  const sl = ctx.srcLine(node)
  if (sl) out.push(sl.trimEnd())

  if (ts.isVariableStatement(node)) {
    for (const d of node.declarationList.declarations) emitVarDecl(ctx, d, out)
    return
  }

  if (ts.isExpressionStatement(node)) {
    if (
      ts.isBinaryExpression(node.expression) &&
      node.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isIdentifier(node.expression.left) &&
      ctx.builderVars.has(node.expression.left.text)
    ) {
      const vn = node.expression.left.text
      const rhs = node.expression.right

      if (ts.isStringLiteral(rhs) && rhs.text === '') {
        out.push(ctx.pad() + `strbuf_clear(&_b_${vn});`)
        return
      }

      if (ts.isBinaryExpression(rhs) && ctx.isBuilderConcat(rhs, vn)) {
        const pieces: ts.Node[] = []
        ctx.flattenBuilderConcat(rhs, vn, pieces)
        for (const piece of pieces) {
          const cs = ctx.extractCharSlice(piece)
          if (cs) {
            out.push(ctx.pad() + `strbuf_add_char(&_b_${vn}, str_at(${cs.str}, (int)(${cs.idx})));`)
          } else {
            const t = ctx.exprType(piece)
            const e = ctx.emitExpr(piece)
            if (t === 'number') out.push(ctx.pad() + `strbuf_add_double(&_b_${vn}, ${e});`)
            else out.push(ctx.pad() + `strbuf_add_str(&_b_${vn}, ${e});`)
          }
        }
        return
      }
    }

    if (
      ts.isBinaryExpression(node.expression) &&
      node.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(node.expression.left) &&
      ctx.currentClass
    ) {
      const lhs = node.expression.left
      if (lhs.expression.kind === ts.SyntaxKind.ThisKeyword) {
        const field = lhs.name.text
        const rhsNode = node.expression.right

        if (ts.isArrayLiteralExpression(rhsNode) && rhsNode.elements.length === 0) {
          const cls = ctx.classDefs.get(ctx.currentClass)
          const fld = cls?.fields.find(f => f.name === field)
          if (fld && fld.tsType.endsWith('[]')) {
            const inner = fld.tsType.replace('[]', '')
            out.push(ctx.pad() + `self->${field} = ${ctx.arrayTypeName(inner)}_new();`)
            return
          }
        }

        const rhs = ctx.emitExpr(rhsNode)
        out.push(ctx.pad() + `self->${field} = ${rhs};`)
        return
      }

      const lhsObjType = ctx.exprType(lhs.expression)
      if (lhsObjType && ctx.classDefs.has(lhsObjType)) {
        const obj = ctx.emitExpr(lhs.expression)
        const field = lhs.name.text
        const rhs = ctx.emitExpr(node.expression.right)
        out.push(ctx.pad() + `${obj}->${field} = ${rhs};`)
        return
      }
    }

    if (
      ts.isBinaryExpression(node.expression) &&
      node.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isIdentifier(node.expression.left)
    ) {
      const varName = node.expression.left.text
      const varType = ctx.varTypes.get(varName)

      if (varType === 'string' && !ctx.builderVars.has(varName)) {
        const tmpId = ctx.nextTempId()
        const rhs = ctx.emitExpr(node.expression.right)
        out.push(ctx.pad() + `Str _old${tmpId} = ${varName};`)
        out.push(ctx.pad() + `${varName} = ${rhs};`)
        out.push(ctx.pad() + `str_release(&_old${tmpId});`)
        return
      }
      if (varType?.endsWith('[]')) {
        const inner = varType.replace('[]', '')
        const tmpId = ctx.nextTempId()
        const arrTypeName = ctx.arrayTypeName(inner)
        const rhs = ctx.emitExpr(node.expression.right)
        out.push(ctx.pad() + `${arrTypeName} _old${tmpId} = ${varName};`)
        out.push(ctx.pad() + `${varName} = ${rhs};`)
        if (inner === 'string') out.push(ctx.pad() + `StrArr_release_deep(&_old${tmpId});`)
        else out.push(ctx.pad() + `${arrTypeName}_release(&_old${tmpId});`)
        return
      }
    }

    const expr = ctx.emitExpr(node.expression)
    out.push(ctx.pad() + expr + ';')
    return
  }

  if (ts.isIfStatement(node)) {
    out.push(ctx.pad() + `if (${ctx.emitExpr(node.expression)}) {`)
    ctx.indent++
    emitBlock(ctx, node.thenStatement, out)
    ctx.indent--
    if (node.elseStatement) {
      if (ts.isIfStatement(node.elseStatement)) {
        out.push(ctx.pad() + `} else`)
        emitStmt(ctx, node.elseStatement, out)
      } else {
        out.push(ctx.pad() + `} else {`)
        ctx.indent++
        emitBlock(ctx, node.elseStatement, out)
        ctx.indent--
        out.push(ctx.pad() + `}`)
      }
    } else {
      out.push(ctx.pad() + `}`)
    }
    return
  }

  if (ts.isWhileStatement(node)) {
    const builders = ts.isBlock(node.statement) ? ctx.detectBuilders(node.statement) : []
    for (const v of builders) {
      out.push(ctx.pad() + `STRBUF(_b_${v}, 4096);`)
      out.push(ctx.pad() + `strbuf_add_str(&_b_${v}, ${v});`)
      ctx.builderVars.add(v)
    }
    const varsBefore = new Set(ctx.varTypes.keys())

    out.push(ctx.pad() + `while (${ctx.emitExpr(node.expression)}) {`)
    ctx.indent++
    emitBlock(ctx, node.statement, out)
    ctx.emitScopeCleanup(varsBefore, out, ts.isBlock(node.statement) ? node.statement : undefined)
    ctx.indent--
    out.push(ctx.pad() + `}`)
    for (const v of builders) {
      out.push(ctx.pad() + `${v} = strbuf_to_heap_str(&_b_${v});`)
      out.push(ctx.pad() + `strbuf_free(&_b_${v});`)
      ctx.builderVars.delete(v)
    }
    return
  }

  if (ts.isReturnStatement(node)) {
    const returnedVar = node.expression && ts.isIdentifier(node.expression) ? node.expression.text : null
    const returnedExpr = ctx.currentFunctionIsAsync
      ? ctx.wrapAsyncReturn(node.expression ?? null)
      : (node.expression ? ctx.emitExpr(node.expression) : null)
    for (let i = ctx.activeTryFrames.length - 1; i >= 0; i--) {
      out.push(ctx.pad() + `ts_exception_pop(&${ctx.activeTryFrames[i]});`)
    }
    for (const vn of ctx.funcDeclaredSoFar) {
      if (vn === returnedVar) continue
      if (ctx.builderVars.has(vn)) continue
      const vt = ctx.varTypes.get(vn)
      if (!vt) continue
      const releases = ctx.getReleaseForType(vn, vt)
      for (const r of releases) out.push(ctx.pad() + r)
    }
    out.push(ctx.pad() + (returnedExpr ? `return ${returnedExpr};` : 'return;'))
    return
  }

  if (ts.isThrowStatement(node) && node.expression) {
    const thrownExpr = emitThrownValue(ctx, node.expression)
    if (ctx.currentCatchTarget) {
      out.push(ctx.pad() + `ts_exception_throw(${thrownExpr});`)
      return
    }
    if (ctx.currentFunctionIsAsync) {
      out.push(ctx.pad() + `return ${ctx.wrapAsyncThrow(thrownExpr)};`)
      return
    }
    out.push(ctx.pad() + `ts_exception_throw(${thrownExpr});`)
    return
  }

  if (ts.isTryStatement(node)) {
    const tryId = ctx.nextTempId()
    const endLabel = `_ts_try_end_${tryId}`
    const frameVar = `_ts_try_${tryId}`
    const emitFinallyBlock = (): void => {
      if (!node.finallyBlock) return
      out.push(ctx.pad() + `{`)
      ctx.indent++
      emitBlock(ctx, node.finallyBlock, out)
      ctx.indent--
      out.push(ctx.pad() + `}`)
    }
    out.push(ctx.pad() + `TSExceptionFrame ${frameVar};`)
    out.push(ctx.pad() + `ts_exception_push(&${frameVar});`)

    const prevCatch = ctx.currentCatchTarget
    ctx.currentCatchTarget = { frameVar }
    ctx.activeTryFrames.push(frameVar)
    out.push(ctx.pad() + `if (setjmp(${frameVar}.env) == 0) {`)
    ctx.indent++
    emitBlock(ctx, node.tryBlock, out)
    out.push(ctx.pad() + `ts_exception_pop(&${frameVar});`)
    emitFinallyBlock()
    out.push(ctx.pad() + `goto ${endLabel};`)
    ctx.indent--
    out.push(ctx.pad() + `}`)
    ctx.currentCatchTarget = prevCatch
    ctx.activeTryFrames.pop()

    if (node.catchClause) {
      out.push(ctx.pad() + `else {`)
      ctx.indent++
      out.push(ctx.pad() + `ts_exception_pop(&${frameVar});`)
      out.push(ctx.pad() + `{`)
      ctx.indent++
      const binding = node.catchClause.variableDeclaration?.name
      if (binding && ts.isIdentifier(binding)) {
        ctx.varTypes.set(binding.text, 'string')
        out.push(ctx.pad() + `Str ${binding.text} = ${frameVar}.error;`)
      }
      emitBlock(ctx, node.catchClause.block, out)
      if (binding && ts.isIdentifier(binding)) {
        ctx.varTypes.delete(binding.text)
      }
      ctx.indent--
      out.push(ctx.pad() + `}`)
      emitFinallyBlock()
      ctx.indent--
      out.push(ctx.pad() + `}`)
    }

    out.push(`${endLabel}: ;`)
    return
  }

  if (ts.isBreakStatement(node)) {
    out.push(ctx.pad() + 'break;')
    return
  }
  if (ts.isContinueStatement(node)) {
    out.push(ctx.pad() + 'continue;')
    return
  }

  if (ts.isForStatement(node)) {
    let init = ''
    if (node.initializer && ts.isVariableDeclarationList(node.initializer)) {
      for (const d of node.initializer.declarations) {
        const n = d.name.getText()
        const ct = ctx.tsTypeToC(d.type)
        init = `${ct} ${n} = ${d.initializer ? ctx.emitExpr(d.initializer) : '0'}`
        ctx.varTypes.set(n, ctx.tsTypeName(d.type))
      }
    }
    out.push(ctx.pad() + `for (${init}; ${node.condition ? ctx.emitExpr(node.condition) : ''}; ${node.incrementor ? ctx.emitExpr(node.incrementor) : ''}) {`)
    ctx.indent++
    if (node.statement) emitBlock(ctx, node.statement, out)
    ctx.indent--
    out.push(ctx.pad() + `}`)
    return
  }

  if (ts.isForOfStatement(node)) {
    const arrExpr = ctx.emitExpr(node.expression)
    const arrType = ctx.exprType(node.expression)

    let varName = '_item'
    if (ts.isVariableDeclarationList(node.initializer)) {
      const decl = node.initializer.declarations[0]
      if (ts.isIdentifier(decl.name)) varName = decl.name.text
    }

    const innerType = arrType?.endsWith('[]') ? arrType.replace('[]', '') : 'number'
    const elemCType = ctx.arrayCElemType(arrType ?? 'number[]')
    ctx.varTypes.set(varName, innerType)

    const id = ctx.nextTempId()
    out.push(ctx.pad() + `for (int _i${id} = 0; _i${id} < ${arrExpr}.len; _i${id}++) {`)
    ctx.indent++
    out.push(ctx.pad() + `${elemCType} ${varName} = ${arrExpr}.data[_i${id}];`)
    emitBlock(ctx, node.statement, out)
    ctx.indent--
    out.push(ctx.pad() + `}`)
    return
  }

  out.push(ctx.pad() + `/* UNSUPPORTED: ${ts.SyntaxKind[node.kind]} */`)
}

export function emitBlock(ctx: StatementEmitterContext, node: ts.Node, out: string[]): void {
  if (ts.isBlock(node)) {
    for (const s of node.statements) emitStmt(ctx, s, out)
  } else {
    emitStmt(ctx, node, out)
  }
}

export function emitVarDecl(ctx: StatementEmitterContext, decl: ts.VariableDeclaration, out: string[]): void {
  if (ctx.hooks.tryEmitBindingDeclaration(decl, out, () => ctx.pad())) return

  const name = decl.name.getText()
  const tsType = decl.type ? ctx.tsTypeName(decl.type) : ctx.inferVarTsType(decl)
  const cType = decl.type ? ctx.tsTypeToC(decl.type) : ctx.inferVarType(decl)
  ctx.varTypes.set(name, tsType)
  ctx.funcLocalVars.set(name, tsType)
  if (ctx.funcTopLevelVars.has(name)) ctx.funcDeclaredSoFar.add(name)

  if (decl.initializer?.getText().includes('require(')) return

  if (decl.initializer && ts.isCallExpression(decl.initializer) && decl.initializer.getText().includes('readFileSync')) {
    ctx.varTypes.set(name, 'string')
    out.push(ctx.pad() + 'OwnedStr _stdin_owned = read_stdin();')
    out.push(ctx.pad() + `Str ${name} = str_from(_stdin_owned.data, _stdin_owned.len);`)
    return
  }

  if (decl.initializer && ts.isCallExpression(decl.initializer) && decl.initializer.getText().includes('JSON.parse')) {
    ctx.needsJsonParser = true
    ctx.jsonParseTargetType = tsType
    const inner = tsType.replace('[]', '')
    const arrTypeName = ctx.arrayTypeName(inner)
    const arg = ctx.emitExpr(decl.initializer.arguments[0])
    out.push(ctx.pad() + `${arrTypeName} ${name} = json_parse_${inner}_array(${arg});`)
    return
  }

  if (decl.initializer && ts.isArrayLiteralExpression(decl.initializer) && decl.initializer.elements.length === 0) {
    const inner = tsType.replace('[]', '')
    const arrTypeName = ctx.arrayTypeName(inner)
    out.push(ctx.pad() + `${arrTypeName} ${name} = ${arrTypeName}_new();`)
    return
  }

  if (decl.initializer && ts.isArrayLiteralExpression(decl.initializer) && decl.initializer.elements.length > 0) {
    const inner = tsType.replace('[]', '')
    const arrTypeName = ctx.arrayTypeName(inner)
    const elemCType = ctx.arrayCElemType(tsType)
    out.push(ctx.pad() + `${arrTypeName} ${name} = ${arrTypeName}_new();`)
    for (const el of decl.initializer.elements) {
      const val = ts.isObjectLiteralExpression(el) ? `(${elemCType})${ctx.emitObjLit(el, inner)}` : ctx.emitExpr(el)
      out.push(ctx.pad() + `${arrTypeName}_push(&${name}, ${val});`)
    }
    return
  }

  if (decl.initializer && ts.isObjectLiteralExpression(decl.initializer)) {
    out.push(ctx.pad() + `${cType} ${name} = (${cType})${ctx.emitObjLit(decl.initializer, tsType)};`)
    return
  }

  if (!decl.initializer) {
    if (cType === 'Str') out.push(ctx.pad() + `Str ${name} = str_lit("");`)
    else if (cType === 'double') out.push(ctx.pad() + `double ${name} = 0;`)
    else if (cType === 'bool') out.push(ctx.pad() + `bool ${name} = false;`)
    else out.push(ctx.pad() + `${cType} ${name} = {0};`)
  } else {
    out.push(ctx.pad() + `${cType} ${name} = ${ctx.emitExpr(decl.initializer)};`)
  }
}
