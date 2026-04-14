/**
 * TSN Statement Codegen
 *
 * Emits C code for TypeScript statements: control flow, loops, variable
 * declarations, try/catch, return, throw, switch. Each handler maps the
 * TS AST node to equivalent C with scope cleanup and ARC release calls.
 *
 * @page language/control-flow
 * @section overview
 */

import * as ts from 'typescript'

import { emitThrownValue, type CatchTarget } from './exceptions.js'
import type { ClassDef } from './types.js'
import { isNullablePrimitive, nullableBaseType } from './types.js'

export interface StatementEmitterContext {
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
  zeroValueForTsType(tsType: string): string
}

/**
 * Control flow in TSN maps directly to C — no hidden transformations,
 * no implicit async boundaries. What you write is what runs.
 *
 * Supported: if/else, for, for-of, while, do-while, switch/case,
 * break, continue, return, throw, try/catch/finally.
 *
 * @page language/control-flow
 * @section overview
 * @syntax if (cond) { } | for (let i = 0; i < n; i++) { } | while (cond) { } | do { } while (cond) | switch (n) { case 1: break } | for (const x of arr) { }
 * @compilesTo Direct C equivalents. for-of becomes an indexed for loop over the array's .data/.len fields. Scope-local variables are released at the end of each iteration via ARC.
 * @example
 * for (const entry of logs) {
 *   if (entry.level === "ERROR") continue
 *   console.log(entry.message)
 * }
 *
 * let retries: number = 0
 * do {
 *   retries = retries + 1
 * } while (retries < 3)
 * @limitation for-in is not supported — only for-of over arrays.
 * @limitation switch expressions are cast to int — no string switch.
 * @limitation Labeled break/continue not supported.
 * @since 0.1.0
 */
export function emitStmt(ctx: StatementEmitterContext, node: ts.Node, out: string[]): void {
  const sl = ctx.srcLine(node)
  if (sl) out.push(sl.trimEnd())

  /*
   * [language/variables :: declarations]
   * Syntax:     const x: number = 42; let name: string = "Alice"
   * Compiles to: double x = 42; Str name = str_lit("Alice");
   * Limitation: var is banned — use let or const.
   * Since: 0.1.0
   */
  if (ts.isVariableStatement(node)) {
    for (const d of node.declarationList.declarations) emitVarDecl(ctx, d, out)
    return
  }

  if (ts.isExpressionStatement(node)) {
    // StrBuf builder: result = "" clears the buffer
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

      // StrBuf builder: result = result + "piece" appends to the buffer
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

    // Class field assignment via this.field = value
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

      // Class instance field assignment: obj.field = value
      const lhsObjType = ctx.exprType(lhs.expression)
      if (lhsObjType && ctx.classDefs.has(lhsObjType)) {
        const obj = ctx.emitExpr(lhs.expression)
        const field = lhs.name.text
        const rhs = ctx.emitExpr(node.expression.right)
        out.push(ctx.pad() + `${obj}->${field} = ${rhs};`)
        return
      }
    }

    // String reassignment: release old refcount before overwriting
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
      // Array reassignment: release old refcount before overwriting
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

  /*
   * [language/control-flow :: if-else]
   * Syntax:      if (cond) { ... } else if (cond2) { ... } else { ... }
   * Compiles to: Direct C if/else. Condition expressions are parenthesized.
   * Since: 0.1.0
   */
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

  /*
   * [language/control-flow :: while]
   * Syntax:      while (condition) { body }
   * Compiles to: C while loop. StrBuf builder detection promotes string
   *              concat variables to stack buffers. Scope cleanup releases
   *              ARC vars declared inside the loop body at end of each iteration.
   * Since: 0.1.0
   */
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

  /*
   * [language/control-flow :: return]
   * Syntax:      return expr
   * Compiles to: Pops any active try frames, releases all ARC-tracked local
   *              variables (except the returned one), then emits C return.
   *              Async functions wrap the return value in a resolved promise.
   *              Returning null/undefined emits the type's zero value.
   * Since: 0.1.0
   */
  if (ts.isReturnStatement(node)) {
    const returnedVar = node.expression && ts.isIdentifier(node.expression) ? node.expression.text : null
    const nullishReturn = !!node.expression &&
      (node.expression.kind === ts.SyntaxKind.NullKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'undefined'))
    const returnedExpr = ctx.currentFunctionIsAsync
      ? ctx.wrapAsyncReturn(node.expression ?? null)
      : (nullishReturn && ctx.currentFunctionReturnTsType
          ? ctx.zeroValueForTsType(ctx.currentFunctionReturnTsType)
          : (node.expression ? ctx.emitExpr(node.expression) : null))
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

  /*
   * [language/exceptions :: throw]
   * Syntax:      throw "error message"
   * Compiles to: ts_exception_throw(str_lit("...")). Inside async
   *              functions, wraps as a rejected promise return instead.
   * Limitation:  Thrown values must be string-shaped. No Error objects.
   * Since: 0.1.0
   */
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

  /*
   * [language/exceptions :: try-catch]
   * Syntax:      try { ... } catch (err) { console.log(err) } finally { ... }
   * Compiles to: Uses setjmp/longjmp via TSExceptionFrame. The try block
   *              pushes a frame; on exception, longjmp jumps to the catch.
   *              Catch variable is always string type. Finally block is emitted
   *              inline after both try and catch paths.
   * Limitation:  No return/break/continue inside try/catch when finally present.
   *              No throw inside catch/finally when finally present.
   * Since: 0.1.0
   */
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

  /*
   * [language/control-flow :: for]
   * Syntax:      for (let i: number = 0; i < n; i++) { body }
   * Compiles to: Direct C for loop. Loop variable is declared in the
   *              initializer. Scope cleanup runs at end of each iteration.
   * Since: 0.1.0
   */
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
    const varsBefore = new Set(ctx.varTypes.keys())
    out.push(ctx.pad() + `for (${init}; ${node.condition ? ctx.emitExpr(node.condition) : ''}; ${node.incrementor ? ctx.emitExpr(node.incrementor) : ''}) {`)
    ctx.indent++
    if (node.statement) emitBlock(ctx, node.statement, out)
    ctx.emitScopeCleanup(varsBefore, out, node.statement && ts.isBlock(node.statement) ? node.statement : undefined)
    ctx.indent--
    out.push(ctx.pad() + `}`)
    return
  }

  /*
   * [language/control-flow :: for-of]
   * Syntax:      for (const item of items) { body }
   * Compiles to: Indexed C for loop: for (int _i = 0; _i < arr.len; _i++).
   *              Non-identifier iterables (e.g. function calls) are hoisted
   *              to a temp to avoid re-evaluation per iteration. Hoisted temps
   *              are released after the loop.
   * Limitation:  Only arrays are iterable. No for-of over strings, Maps, Sets.
   *              No destructuring in the loop variable (not yet).
   * Example:     for (const name of names) { console.log(name) }
   * Since: 0.1.0
   */
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
    const arrTypeC = ctx.arrayTypeName(innerType)
    ctx.varTypes.set(varName, innerType)

    const id = ctx.nextTempId()
    const isSimple = /^[a-zA-Z_]\w*$/.test(arrExpr)
    const arrRef = isSimple ? arrExpr : `_for${id}`
    if (!isSimple) {
      out.push(ctx.pad() + `${arrTypeC} ${arrRef} = ${arrExpr};`)
    }
    const varsBefore = new Set(ctx.varTypes.keys())
    out.push(ctx.pad() + `for (int _i${id} = 0; _i${id} < ${arrRef}.len; _i${id}++) {`)
    ctx.indent++
    out.push(ctx.pad() + `${elemCType} ${varName} = ${arrRef}.data[_i${id}];`)
    emitBlock(ctx, node.statement, out)
    ctx.emitScopeCleanup(varsBefore, out, ts.isBlock(node.statement) ? node.statement : undefined)
    ctx.indent--
    out.push(ctx.pad() + `}`)
    if (!isSimple && innerType === 'string') {
      out.push(ctx.pad() + `StrArr_release_deep(&${arrRef});`)
    } else if (!isSimple) {
      out.push(ctx.pad() + `${arrTypeC}_release(&${arrRef});`)
    }
    return
  }

  /*
   * [language/control-flow :: do-while]
   * Syntax:      do { body } while (condition)
   * Compiles to: C do-while with identical structure. Builder detection
   *              and scope cleanup run the same as while loops. Body always
   *              executes at least once.
   * Example:     let i: number = 0; do { i = i + 1 } while (i < 10)
   * Since: 0.2.0
   */
  if (ts.isDoStatement(node)) {
    const builders = ts.isBlock(node.statement) ? ctx.detectBuilders(node.statement) : []
    for (const v of builders) {
      out.push(ctx.pad() + `STRBUF(_b_${v}, 4096);`)
      out.push(ctx.pad() + `strbuf_add_str(&_b_${v}, ${v});`)
      ctx.builderVars.add(v)
    }
    const varsBefore = new Set(ctx.varTypes.keys())

    out.push(ctx.pad() + `do {`)
    ctx.indent++
    emitBlock(ctx, node.statement, out)
    ctx.emitScopeCleanup(varsBefore, out, ts.isBlock(node.statement) ? node.statement : undefined)
    ctx.indent--
    out.push(ctx.pad() + `} while (${ctx.emitExpr(node.expression)});`)
    for (const v of builders) {
      out.push(ctx.pad() + `${v} = strbuf_to_heap_str(&_b_${v});`)
      out.push(ctx.pad() + `strbuf_free(&_b_${v});`)
      ctx.builderVars.delete(v)
    }
    return
  }

  /*
   * [language/control-flow :: switch]
   * Syntax:      switch (expr) { case 1: ... break; default: ... }
   * Compiles to: C switch on (int)(expr). Cases must be numeric literals.
   *              Fall-through works like C — use break to prevent it.
   * Limitation:  Switch expression is cast to int. No string switch.
   * Example:     switch (status) { case 200: console.log("ok"); break }
   * Since: 0.1.0
   */
  if (ts.isSwitchStatement(node)) {
    out.push(ctx.pad() + `switch ((int)(${ctx.emitExpr(node.expression)})) {`)
    ctx.indent++
    for (const clause of node.caseBlock.clauses) {
      if (ts.isCaseClause(clause)) out.push(ctx.pad() + `case ${ctx.emitExpr(clause.expression)}: ;`)
      else out.push(ctx.pad() + 'default: ;')
      for (const stmt of clause.statements) emitStmt(ctx, stmt, out)
    }
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

/**
 * Use `const` and `let` to declare variables. `var` is banned.
 *
 * Types can be explicit or inferred from the initializer. When the
 * compiler can't infer the type, it defaults to `number`.
 *
 * Variables used by functions should have explicit type annotations
 * to ensure correct codegen.
 *
 * @page language/variables
 * @section declarations
 * @syntax const x: number = 42 | let name: string = "Alice" | const arr: number[] = []
 * @compilesTo C variable declarations with the mapped type. Arrays
 * initialize via TArr_new(). Object literals become C struct initializers.
 * Nullable primitives (number | null) use tagged structs with a has_value flag.
 * @example
 * const count: number = 42
 * let name: string = "Alice"
 * const scores: number[] = []
 * const config: Config = { host: "localhost", port: 8080 }
 *
 * // Nullable primitives
 * const maybeCount: number | null = null
 * const result: number = maybeCount ?? 0
 * @limitation var is banned — use let or const.
 * @limitation Destructuring declarations are not yet supported.
 * @limitation Type inference defaults to number when ambiguous — prefer explicit annotations.
 * @since 0.1.0
 */
export function emitVarDecl(ctx: StatementEmitterContext, decl: ts.VariableDeclaration, out: string[]): void {
  const name = decl.name.getText()
  const tsType = decl.type ? ctx.tsTypeName(decl.type) : ctx.inferVarTsType(decl)
  const cType = decl.type ? ctx.tsTypeToC(decl.type) : ctx.inferVarType(decl)
  ctx.varTypes.set(name, tsType)
  ctx.funcLocalVars.set(name, tsType)
  if (ctx.funcTopLevelVars.has(name)) ctx.funcDeclaredSoFar.add(name)

  // Node compat: require() calls are skipped (no runtime module system)
  if (decl.initializer?.getText().includes('require(')) return

  // stdin: fs.readFileSync mapped to read_stdin()
  if (decl.initializer && ts.isCallExpression(decl.initializer) && decl.initializer.getText().includes('readFileSync')) {
    ctx.varTypes.set(name, 'string')
    out.push(ctx.pad() + 'OwnedStr _stdin_owned = read_stdin();')
    out.push(ctx.pad() + `Str ${name} = str_from(_stdin_owned.data, _stdin_owned.len);`)
    return
  }

  // JSON.parse: generates a typed parser for the target interface
  if (decl.initializer && ts.isCallExpression(decl.initializer) && decl.initializer.getText().includes('JSON.parse')) {
    ctx.needsJsonParser = true
    ctx.jsonParseTargetType = tsType
    const inner = tsType.replace('[]', '')
    const arrTypeName = ctx.arrayTypeName(inner)
    const arg = ctx.emitExpr(decl.initializer.arguments[0])
    out.push(ctx.pad() + `${arrTypeName} ${name} = json_parse_${inner}_array(${arg});`)
    return
  }

  // Empty array literal: T[] = []
  if (decl.initializer && ts.isArrayLiteralExpression(decl.initializer) && decl.initializer.elements.length === 0) {
    const inner = tsType.replace('[]', '')
    const arrTypeName = ctx.arrayTypeName(inner)
    out.push(ctx.pad() + `${arrTypeName} ${name} = ${arrTypeName}_new();`)
    return
  }

  // Non-empty array literal: T[] = [a, b, c]
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

  // Object literal: Interface = { field: value }
  if (decl.initializer && ts.isObjectLiteralExpression(decl.initializer)) {
    out.push(ctx.pad() + `${cType} ${name} = (${cType})${ctx.emitObjLit(decl.initializer, tsType)};`)
    return
  }

  if (!decl.initializer) {
    // Uninitialized: use type-appropriate zero value
    if (tsType.endsWith('?')) out.push(ctx.pad() + `${cType} ${name} = ${ctx.zeroValueForTsType(tsType)};`)
    else if (cType === 'Str') out.push(ctx.pad() + `Str ${name} = str_lit("");`)
    else if (cType === 'double') out.push(ctx.pad() + `double ${name} = 0;`)
    else if (cType === 'bool') out.push(ctx.pad() + `bool ${name} = false;`)
    else out.push(ctx.pad() + `${cType} ${name} = {0};`)
  } else if (decl.initializer.kind === ts.SyntaxKind.NullKeyword || (ts.isIdentifier(decl.initializer) && decl.initializer.text === 'undefined')) {
    // Explicit null/undefined: use type's zero value (nullable primitives get has_value=false)
    out.push(ctx.pad() + `${cType} ${name} = ${ctx.zeroValueForTsType(tsType)};`)
  } else if (isNullablePrimitive(tsType)) {
    // Nullable primitive with a value: wrap in tagged struct { value, has_value=true }
    const val = ctx.emitExpr(decl.initializer)
    out.push(ctx.pad() + `${cType} ${name} = (${cType}){${val}, true};`)
  } else {
    out.push(ctx.pad() + `${cType} ${name} = ${ctx.emitExpr(decl.initializer)};`)
  }
}
