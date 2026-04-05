/**
 * StrictTS Code Generator v3 — Generate actual C.
 *
 * Type mappings:
 *   number       → double
 *   string       → Str  (16 bytes, by value, zero alloc)
 *   boolean      → bool
 *   JSX.Element  → UIHandle
 *   T[]          → TArr (typed dynamic array via DEFINE_ARRAY macro)
 *   interface T  → struct T
 *   function     → C function
 *
 * String strategy:
 *   - Literals: str_lit("x") — points to .rodata, zero alloc
 *   - Slices: str_slice(s, a, b) — pointer arithmetic, zero alloc
 *   - Char compare: str_at(s, i) == 'x' — zero alloc
 *   - Building: StrBuf on stack, write chars, finish to Str
 *   - Concat for return: strbuf, append pieces, finish
 *
 * console.log strategy:
 *   - Write pieces directly to stdout via print_str/print_num/print_cstr
 *   - No string concatenation at all for output
 */

import * as ts from 'typescript'
import { JsxEmitter, type CodeGenContext } from './jsx.js'
import { emitStringMethod } from './stdlib/strings.js'
import { emitArrayMethod } from './stdlib/arrays.js'

interface StructField {
  name: string
  tsType: string
  cType: string
}

interface StructDef {
  name: string
  fields: StructField[]
}

interface FuncSig {
  name: string
  params: Array<{ name: string; tsType: string; cType: string }>
  returnType: string
  returnCType: string
}

interface ParamAlias {
  name: string
  tsType: string
  cType: string
  accessExpr: string
}

interface ParamInfo {
  name: string
  tsType: string
  cType: string
  aliases: ParamAlias[]
}

interface HookState {
  kind: 'state' | 'route'
  sourceValueName: string
  sourceSetterName: string
  tsType: string
  cType: string
  valueSymbol: string
  initSymbol: string
  applySymbol: string
}

class CodeGen {
  private structs: StructDef[] = []
  private functions: string[] = []
  funcSigs: Map<string, FuncSig> = new Map()
  lambdas: string[] = []
  private lambdaCounter = 0
  varTypes: Map<string, string> = new Map()
  indent = 0
  private needsJsonParser = false
  private jsonParseTargetType = ''
  private arrayTypes: Set<string> = new Set()  // track which array types we need
  // Track variables that are being built with StrBuf in current scope
  private builderVars: Set<string> = new Set()
  private funcLocalVars: Map<string, string> = new Map()
  private funcTopLevelVars: Set<string> = new Set()
  private funcDeclaredSoFar: Set<string> = new Set()  // tracks declaration order for return cleanup
  private identifierAliases: Map<string, string> = new Map()
  private hookStates: HookState[] = []
  private hookStatesBySetter: Map<string, HookState> = new Map()
  private jsxBootStmts: string[] = []
  // JSX support
  jsxStmts: string[] = []    // accumulated C statements from JSX emission
  jsxGlobals: string[] = []  // global variable declarations for JSX mode
  hasJsx = false              // track if source uses JSX (for includes/linking)
  private jsxEmitter: JsxEmitter
  private activeStmtSink: string[] | null = null
  // Source mapping
  private sourceFile: ts.SourceFile | null = null
  private sourceFileName = ''

  constructor() {
    this.jsxEmitter = new JsxEmitter(this as CodeGenContext)
  }

  // ─── Type Resolution ────────────────────────────────────────────

  private tsTypeNameToC(tsType: string, fallback = 'double'): string {
    if (tsType.endsWith('[]')) {
      const inner = tsType.slice(0, -2)
      return this.arrayTypeName(inner)
    }
    switch (tsType) {
      case 'number': return 'double'
      case 'string': return 'Str'
      case 'boolean': return 'bool'
      case 'void': return 'void'
      case 'JSX.Element': return 'UIHandle'
      default: return tsType || fallback
    }
  }

  private tsTypeToC(typeNode: ts.TypeNode | undefined, fallback = 'double'): string {
    if (!typeNode) return fallback
    return this.tsTypeNameToC(this.tsTypeName(typeNode), fallback)
  }

  private tsTypeName(typeNode: ts.TypeNode | undefined): string {
    if (!typeNode) return 'number'
    if (ts.isTypeReferenceNode(typeNode)) {
      const name = typeNode.typeName.getText()
      if (name === 'Array' && typeNode.typeArguments?.length)
        return this.tsTypeName(typeNode.typeArguments[0]) + '[]'
      return name
    }
    if (ts.isArrayTypeNode(typeNode))
      return this.tsTypeName(typeNode.elementType) + '[]'
    return typeNode.getText()
  }

  arrayTypeName(innerTsType: string): string {
    // Person[] → PersonArr, string[] → StrArr, number[] → DoubleArr
    switch (innerTsType) {
      case 'string': this.arrayTypes.add('Str'); return 'StrArr'
      case 'number': this.arrayTypes.add('double'); return 'DoubleArr'
      case 'boolean': this.arrayTypes.add('bool'); return 'BoolArr'
      case 'JSX.Element': this.arrayTypes.add('UIHandle'); return 'UIHandleArr'
      default:
        this.arrayTypes.add(innerTsType)
        return `${innerTsType}Arr`
    }
  }

  arrayCElemType(tsType: string): string {
    const inner = tsType.replace('[]', '')
    switch (inner) {
      case 'string': return 'Str'
      case 'number': return 'double'
      case 'boolean': return 'bool'
      case 'JSX.Element': return 'UIHandle'
      default: return inner
    }
  }

  pushJsxStmt(line: string): void {
    ;(this.activeStmtSink ?? this.jsxStmts).push(line)
  }

  getStructFields(name: string): Array<{ name: string; tsType: string; cType: string }> | undefined {
    return this.structs.find(s => s.name === name)?.fields
  }

  private withStmtSink<T>(sink: string[], fn: () => T): T {
    const prev = this.activeStmtSink
    this.activeStmtSink = sink
    try {
      return fn()
    } finally {
      this.activeStmtSink = prev
    }
  }

  nextTempId(): number {
    const id = this.lambdaCounter
    this.lambdaCounter = this.lambdaCounter + 1
    return id
  }

  emitPredicateCallback(fnExpr: ts.Expression, paramType: string): { paramName: string; body: string } | null {
    if (!ts.isArrowFunction(fnExpr) || fnExpr.parameters.length === 0) return null
    const paramName = fnExpr.parameters[0].name.getText()
    const prev = this.varTypes.get(paramName)
    this.varTypes.set(paramName, paramType)
    let body: string
    if (ts.isBlock(fnExpr.body)) {
      const ret = fnExpr.body.statements.find(s => ts.isReturnStatement(s)) as ts.ReturnStatement | undefined
      body = ret?.expression ? this.emitExpr(ret.expression) : 'true'
    } else {
      body = this.emitExpr(fnExpr.body)
    }
    if (prev) this.varTypes.set(paramName, prev); else this.varTypes.delete(paramName)
    return { paramName, body }
  }

  private inferFunctionReturnType(node: ts.FunctionDeclaration): { tsType: string; cType: string } {
    if (node.type) {
      const tsType = this.tsTypeName(node.type)
      return { tsType, cType: this.tsTypeNameToC(tsType, 'void') }
    }

    let inferred = 'void'
    const visit = (child: ts.Node): void => {
      if (inferred !== 'void') return
      if (ts.isReturnStatement(child) && child.expression) {
        const expr = this.unwrapParens(child.expression)
        if (ts.isJsxElement(expr) || ts.isJsxSelfClosingElement(expr) || ts.isJsxFragment(expr)) {
          inferred = 'JSX.Element'
          return
        }
        inferred = this.exprType(expr) ?? 'void'
        return
      }
      ts.forEachChild(child, visit)
    }
    if (node.body) visit(node.body)
    return { tsType: inferred, cType: this.tsTypeNameToC(inferred, 'void') }
  }

  private describeParameter(p: ts.ParameterDeclaration, index: number): ParamInfo {
    const tsType = this.tsTypeName(p.type)
    const cType = this.tsTypeNameToC(tsType)
    const name = ts.isIdentifier(p.name) ? p.name.text : `_arg${index}`
    const aliases: ParamAlias[] = []

    if (ts.isObjectBindingPattern(p.name)) {
      const fields = this.getStructFields(tsType) ?? []
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

  private isHookCall(node: ts.Expression | undefined, kind?: 'state' | 'route'): node is ts.CallExpression {
    if (!node || !ts.isCallExpression(node) || !ts.isIdentifier(node.expression)) return false
    if (kind === 'state') return node.expression.text === 'useState'
    if (kind === 'route') return node.expression.text === 'useRoute'
    return node.expression.text === 'useState' || node.expression.text === 'useRoute'
  }

  private inferHookTsType(call: ts.CallExpression): string {
    if (ts.isIdentifier(call.expression) && call.expression.text === 'useRoute') return 'string'
    if (call.typeArguments?.length) return this.tsTypeName(call.typeArguments[0])
    if (call.arguments.length > 0) return this.exprType(call.arguments[0]) ?? 'number'
    return 'number'
  }

  private zeroInitForType(tsType: string, cType: string): string {
    if (tsType === 'string') return '(Str){0}'
    if (tsType === 'number') return '0'
    if (tsType === 'boolean') return 'false'
    if (tsType.endsWith('[]')) return `(${cType}){0}`
    return `(${cType}){0}`
  }

  private retainForHookType(tsType: string, expr: string): string {
    if (tsType === 'string') return `str_retain(${expr})`
    if (tsType.endsWith('[]')) {
      const inner = tsType.replace('[]', '')
      return `${this.arrayTypeName(inner)}_retain(${expr})`
    }
    return expr
  }

  private registerHookState(
    kind: 'state' | 'route',
    valueName: string,
    setterName: string,
    tsType: string
  ): HookState {
    if (kind === 'route') {
      const existing = this.hookStates.find(h => h.kind === 'route')
      if (existing) {
        this.identifierAliases.set(valueName, existing.valueSymbol)
        this.hookStatesBySetter.set(setterName, existing)
        return existing
      }
    }

    const id = this.hookStates.length
    const cType = this.tsTypeNameToC(tsType)
    const hook: HookState = {
      kind,
      sourceValueName: valueName,
      sourceSetterName: setterName,
      tsType,
      cType,
      valueSymbol: kind === 'route' ? '_route_state' : `_hook_state_${id}`,
      initSymbol: kind === 'route' ? '_route_init' : `_hook_init_${id}`,
      applySymbol: kind === 'route' ? '_route_navigate' : `_hook_apply_${id}`,
    }
    this.hookStates.push(hook)
    this.identifierAliases.set(valueName, hook.valueSymbol)
    this.hookStatesBySetter.set(setterName, hook)
    return hook
  }

  private emitHookInitializer(
    hook: HookState,
    initExpr: ts.Expression | undefined,
    out: string[]
  ): void {
    const initial = initExpr ? this.retainForHookType(hook.tsType, this.emitExpr(initExpr)) : this.zeroInitForType(hook.tsType, hook.cType)
    out.push(this.pad() + `if (!${hook.initSymbol}) {`)
    this.indent++
    out.push(this.pad() + `${hook.valueSymbol} = ${initial};`)
    out.push(this.pad() + `${hook.initSymbol} = true;`)
    this.indent--
    out.push(this.pad() + `}`)
  }

  private emitHookSetterCall(hook: HookState, args: ts.NodeArray<ts.Expression>): string {
    if (args.length === 0) return `${hook.applySymbol}(${hook.valueSymbol})`
    const update = args[0]
    if (ts.isArrowFunction(update) && update.parameters.length > 0) {
      const paramName = update.parameters[0].name.getText()
      const prevType = this.varTypes.get(paramName)
      const prevAlias = this.identifierAliases.get(paramName)
      this.varTypes.set(paramName, hook.tsType)
      this.identifierAliases.set(paramName, hook.valueSymbol)
      let nextExpr = hook.valueSymbol
      if (ts.isBlock(update.body)) {
        const ret = update.body.statements.find(s => ts.isReturnStatement(s)) as ts.ReturnStatement | undefined
        nextExpr = ret?.expression ? this.emitExpr(ret.expression) : hook.valueSymbol
      } else {
        nextExpr = this.emitExpr(update.body)
      }
      if (prevType) this.varTypes.set(paramName, prevType); else this.varTypes.delete(paramName)
      if (prevAlias) this.identifierAliases.set(paramName, prevAlias); else this.identifierAliases.delete(paramName)
      return `${hook.applySymbol}(${nextExpr})`
    }
    return `${hook.applySymbol}(${this.emitExpr(update)})`
  }

  /** Infer C type from a variable declaration's initializer */
  private inferVarType(d: ts.VariableDeclaration): string {
    if (!d.initializer) return 'double'
    const tsType = this.exprType(d.initializer)
    if (tsType === 'string') return 'Str'
    if (tsType === 'number') return 'double'
    if (tsType === 'boolean') return 'bool'
    if (tsType?.endsWith('[]')) return this.arrayTypeName(tsType.replace('[]', ''))
    if (tsType && this.structs.some(s => s.name === tsType)) return tsType
    // Check if it's a function call — infer from return type
    if (ts.isCallExpression(d.initializer)) {
      const fnName = d.initializer.expression.getText()
      const sig = this.funcSigs.get(fnName)
      if (sig) {
        const rt = sig.returnCType
        return rt.startsWith('struct ') ? rt.replace('struct ', '') : rt
      }
    }
    return 'double'
  }

  /** Infer TypeScript type name from a variable declaration's initializer */
  private inferVarTsType(d: ts.VariableDeclaration): string {
    if (!d.initializer) return 'number'
    const tsType = this.exprType(d.initializer)
    if (tsType) return tsType
    if (ts.isCallExpression(d.initializer)) {
      const fnName = d.initializer.expression.getText()
      const sig = this.funcSigs.get(fnName)
      if (sig) return sig.returnType
    }
    return 'number'
  }

  private unwrapParens<T extends ts.Node>(node: T): ts.Node {
    let current: ts.Node = node
    while (ts.isParenthesizedExpression(current)) current = current.expression
    return current
  }

  // ─── Struct Generation ──────────────────────────────────────────

  private emitInterface(node: ts.InterfaceDeclaration): void {
    const name = node.name.text
    const fields: StructField[] = []
    for (const m of node.members) {
      if (ts.isPropertySignature(m) && m.name) {
        const fname = m.name.getText()
        const tsType = this.tsTypeName(m.type)
        const cType = this.tsTypeToC(m.type)
        fields.push({ name: fname, tsType, cType })
      }
    }
    this.structs.push({ name, fields })
  }

  // ─── Expression Generation ──────────────────────────────────────

  emitExpr(node: ts.Node): string {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
      return `str_lit(${JSON.stringify(node.text)})`

    if (ts.isNumericLiteral(node)) return node.text

    if (node.kind === ts.SyntaxKind.TrueKeyword) return 'true'
    if (node.kind === ts.SyntaxKind.FalseKeyword) return 'false'

    if (ts.isIdentifier(node)) {
      // If this var is a builder, emit a zero-alloc view of the builder content
      if (this.builderVars.has(node.text)) {
        return `strbuf_to_str(&_b_${node.text})`
      }
      const alias = this.identifierAliases.get(node.text)
      if (alias) return alias
      return node.text
    }

    if (ts.isParenthesizedExpression(node))
      return `(${this.emitExpr(node.expression)})`

    if (ts.isPropertyAccessExpression(node))
      return this.emitPropAccess(node)

    if (ts.isElementAccessExpression(node)) {
      const arr = this.emitExpr(node.expression)
      const arrName = node.expression.getText()
      const idx = this.emitExpr(node.argumentExpression)
      const sl = this.sourceFile ? this.sourceFile.getLineAndCharacterOfPosition(node.getStart()) : null
      const file = this.sourceFileName || 'unknown'
      const line = sl ? sl.line + 1 : 0
      return `ARRAY_GET(${arr}, ${idx}, "${arrName}", "${file}", ${line})`
    }

    if (ts.isCallExpression(node))
      return this.emitCall(node)

    if (ts.isBinaryExpression(node))
      return this.emitBinary(node)

    if (ts.isPrefixUnaryExpression(node)) {
      const op = node.operator === ts.SyntaxKind.ExclamationToken ? '!' :
                 node.operator === ts.SyntaxKind.MinusToken ? '-' : '+'
      return `${op}${this.emitExpr(node.operand)}`
    }

    if (ts.isConditionalExpression(node))
      return `(${this.emitExpr(node.condition)} ? ${this.emitExpr(node.whenTrue)} : ${this.emitExpr(node.whenFalse)})`

    if (ts.isObjectLiteralExpression(node))
      return this.emitObjLit(node)

    if (ts.isTemplateExpression(node))
      return this.emitTemplate(node)

    if (ts.isArrowFunction(node))
      return `_lambda_${this.lambdaCounter++}`

    // Empty array literal [] in expression context
    if (ts.isArrayLiteralExpression(node) && node.elements.length === 0)
      return `StrArr_new()` // default to StrArr; will be overridden by var decl context

    // JSX support — delegated to JsxEmitter
    if (ts.isJsxElement(node))
      return this.jsxEmitter.emitElement(node.openingElement, node.children)
    if (ts.isJsxSelfClosingElement(node))
      return this.jsxEmitter.emitElement(node, [])
    if (ts.isJsxExpression(node) && node.expression)
      return this.emitExpr(node.expression)
    if (ts.isJsxFragment(node))
      return this.jsxEmitter.emitFragment(node.children)

    return `/* UNSUPPORTED: ${ts.SyntaxKind[node.kind]} */0`
  }

  private emitPropAccess(node: ts.PropertyAccessExpression): string {
    const prop = node.name.text
    if (ts.isIdentifier(node.expression)) {
      if (node.expression.text === 'console') return `console_${prop}`
      if (node.expression.text === 'Math') return `ts_math_${prop}`
      if (node.expression.text === 'JSON') return `json_${prop}`
    }
    // Builder var .length → use builder's len directly (zero alloc)
    if (prop === 'length' && ts.isIdentifier(node.expression) && this.builderVars.has(node.expression.text)) {
      return `_b_${node.expression.text}.len`
    }
    const obj = this.emitExpr(node.expression)
    if (prop === 'length') {
      return `${obj}.len`
    }
    return `${obj}.${prop}`
  }

  private emitCall(node: ts.CallExpression): string {
    if (ts.isIdentifier(node.expression)) {
      const hookSetter = this.hookStatesBySetter.get(node.expression.text)
      if (hookSetter) return this.emitHookSetterCall(hookSetter, node.arguments)
    }

    if (ts.isPropertyAccessExpression(node.expression)) {
      const obj = node.expression.expression
      const method = node.expression.name.text
      const objExpr = this.emitExpr(obj)
      const objType = this.exprType(obj)

      // console.log → direct stdout writes
      if (ts.isIdentifier(obj) && obj.text === 'console' && method === 'log')
        return this.emitConsoleLog(node.arguments)

      // Math.*
      if (ts.isIdentifier(obj) && obj.text === 'Math') {
        const args = node.arguments.map(a => this.emitExpr(a)).join(', ')
        return `ts_math_${method}(${args})`
      }

      // JSON.parse
      if (ts.isIdentifier(obj) && obj.text === 'JSON' && method === 'parse')
        return `json_parse_data(${this.emitExpr(node.arguments[0])})`

      // String methods
      if (objType === 'string') {
        const emitted = emitStringMethod(this, objExpr, method, node.arguments)
        if (emitted) return emitted
      }

      // Array methods
      if (objType?.endsWith('[]')) {
        const innerType = objType.replace('[]', '')
        const arrTypeName = this.arrayTypeName(innerType)

        if (method === 'push') {
          const arg = node.arguments[0]
          if (ts.isIdentifier(arg) && this.builderVars.has(arg.text)) {
            return `${arrTypeName}_push(&${objExpr}, strbuf_to_heap_str(&_b_${arg.text}))`
          }
          let val = this.emitExpr(arg)
          // Retain strings being pushed — they must outlive their source
          if (innerType === 'string') val = `str_retain(${val})`
          return `${arrTypeName}_push(&${objExpr}, ${val})`
        }
        const emitted = emitArrayMethod(this, objExpr, objType, method, node.arguments)
        if (emitted) return emitted
        if (method === 'filter') return this.emitFilter(node, objExpr, objType)
        if (method === 'sort') return this.emitSort(node, objExpr, objType)
      }
    }

    // String(x)
    if (ts.isIdentifier(node.expression) && node.expression.text === 'String')
      return `num_to_str(${this.emitExpr(node.arguments[0])})`

    if (ts.isIdentifier(node.expression) && node.expression.text === 'parseFloat')
      return `ts_parse_float(${this.emitExpr(node.arguments[0])})`

    if (ts.isIdentifier(node.expression) && node.expression.text === 'parseInt')
      return `ts_parse_int(${this.emitExpr(node.arguments[0])})`

    // Regular function call
    const name = this.emitExpr(node.expression)
    const args = node.arguments.map(a => {
      // Builder vars passed to functions need heap allocation (function might store them)
      if (ts.isIdentifier(a) && this.builderVars.has(a.text))
        return `strbuf_to_heap_str(&_b_${a.text})`
      return this.emitExpr(a)
    }).join(', ')
    return `${name}(${args})`
  }

  private emitConsoleLog(args: ts.NodeArray<ts.Expression>): string {
    // Emit as a series of direct stdout writes — ZERO string allocation.
    // We generate a compound statement: ({ print_x(...); print_nl(); })
    const parts: string[] = []
    for (const arg of args) {
      this.emitPrintExpr(arg, parts)
    }
    parts.push('print_nl()')
    return `({ ${parts.join('; ')}; })`
  }

  // Recursively decompose a concat expression into direct print calls
  private emitPrintExpr(node: ts.Expression, parts: string[]): void {
    // str + str → print each side separately (no concat!)
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const lt = this.exprType(node.left)
      const rt = this.exprType(node.right)
      if (lt === 'string' || rt === 'string') {
        this.emitPrintExpr(node.left as ts.Expression, parts)
        this.emitPrintExpr(node.right as ts.Expression, parts)
        return
      }
    }

    // Call to String(x) → print_num
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'String') {
      parts.push(`print_num(${this.emitExpr(node.arguments[0])})`)
      return
    }

    const t = this.exprType(node)
    const e = this.emitExpr(node)
    if (t === 'string') parts.push(`print_str(${e})`)
    else if (t === 'number') parts.push(`print_num(${e})`)
    else if (t === 'boolean') parts.push(`print_bool(${e})`)
    else parts.push(`print_str(${e})`)
  }

  private emitBinary(node: ts.BinaryExpression): string {
    const op = node.operatorToken.kind
    const lt = this.exprType(node.left)
    const rt = this.exprType(node.right)
    const left = this.emitExpr(node.left)
    const right = this.emitExpr(node.right)

    // String concat: str + str → strbuf-based
    // Flatten the entire concat chain into a single strbuf — no intermediate heap strings.
    if (op === ts.SyntaxKind.PlusToken && (lt === 'string' || rt === 'string')) {
      const pieces: Array<{ expr: string; type: string }> = []
      this.flattenConcat(node, pieces)
      const bufName = `_cat${this.lambdaCounter++}`
      const adds = pieces.map(p => {
        if (p.type === 'number') return `strbuf_add_double(&${bufName}, ${p.expr})`
        return `strbuf_add_str(&${bufName}, ${p.expr})`
      }).join('; ')
      // strbuf_free cleans up if the buffer spilled to heap
      return `({ STRBUF(${bufName}, 256); ${adds}; Str _r${bufName} = strbuf_to_heap_str(&${bufName}); strbuf_free(&${bufName}); _r${bufName}; })`
    }

    // String equality
    if ((op === ts.SyntaxKind.EqualsEqualsEqualsToken || op === ts.SyntaxKind.EqualsEqualsToken) && lt === 'string' && rt === 'string') {
      // Optimize: slice(i, i+1) === "x" → char comparison
      const charCmp = this.tryCharCompare(node.left, node.right, false)
      if (charCmp) return charCmp
      return `str_eq(${left}, ${right})`
    }
    if ((op === ts.SyntaxKind.ExclamationEqualsEqualsToken || op === ts.SyntaxKind.ExclamationEqualsToken) && lt === 'string' && rt === 'string') {
      const charCmp = this.tryCharCompare(node.left, node.right, true)
      if (charCmp) return charCmp
      return `!str_eq(${left}, ${right})`
    }

    if (op === ts.SyntaxKind.EqualsToken) {
      // Element access on LHS needs bounds-checked set, not get
      if (ts.isElementAccessExpression(node.left)) {
        const arr = this.emitExpr(node.left.expression)
        const arrName = node.left.expression.getText()
        const idx = this.emitExpr(node.left.argumentExpression)
        const sl = this.sourceFile ? this.sourceFile.getLineAndCharacterOfPosition(node.left.getStart()) : null
        const file = this.sourceFileName || 'unknown'
        const line = sl ? sl.line + 1 : 0
        return `ARRAY_SET(${arr}, ${idx}, ${right}, "${arrName}", "${file}", ${line})`
      }
      return `${left} = ${right}`
    }

    // Non-string equality
    if (op === ts.SyntaxKind.EqualsEqualsEqualsToken || op === ts.SyntaxKind.EqualsEqualsToken)
      return `(${left} == ${right})`
    if (op === ts.SyntaxKind.ExclamationEqualsEqualsToken || op === ts.SyntaxKind.ExclamationEqualsToken)
      return `(${left} != ${right})`

    // Compound assignment on element access: arr[i] += val → ARRAY_SET with read+op
    if ((op === ts.SyntaxKind.PlusEqualsToken || op === ts.SyntaxKind.MinusEqualsToken) &&
        ts.isElementAccessExpression(node.left)) {
      const arr = this.emitExpr(node.left.expression)
      const arrName = node.left.expression.getText()
      const idx = this.emitExpr(node.left.argumentExpression)
      const sl = this.sourceFile ? this.sourceFile.getLineAndCharacterOfPosition(node.left.getStart()) : null
      const file = this.sourceFileName || 'unknown'
      const line = sl ? sl.line + 1 : 0
      const cOp = op === ts.SyntaxKind.PlusEqualsToken ? '+' : '-'
      return `ARRAY_SET(${arr}, ${idx}, ARRAY_GET(${arr}, ${idx}, "${arrName}", "${file}", ${line}) ${cOp} ${right}, "${arrName}", "${file}", ${line})`
    }

    const opMap: Record<number, string> = {
      [ts.SyntaxKind.PlusToken]: '+', [ts.SyntaxKind.MinusToken]: '-',
      [ts.SyntaxKind.AsteriskToken]: '*', [ts.SyntaxKind.SlashToken]: '/',
      [ts.SyntaxKind.PercentToken]: '%',
      [ts.SyntaxKind.LessThanToken]: '<', [ts.SyntaxKind.LessThanEqualsToken]: '<=',
      [ts.SyntaxKind.GreaterThanToken]: '>', [ts.SyntaxKind.GreaterThanEqualsToken]: '>=',
      [ts.SyntaxKind.AmpersandAmpersandToken]: '&&', [ts.SyntaxKind.BarBarToken]: '||',
      [ts.SyntaxKind.AmpersandToken]: '&', [ts.SyntaxKind.BarToken]: '|',
      [ts.SyntaxKind.CaretToken]: '^',
      [ts.SyntaxKind.LessThanLessThanToken]: '<<', [ts.SyntaxKind.GreaterThanGreaterThanToken]: '>>',
      [ts.SyntaxKind.PlusEqualsToken]: '+=', [ts.SyntaxKind.MinusEqualsToken]: '-=',
    }
    return `(${left} ${opMap[op] || '?'} ${right})`
  }

  private flattenConcat(node: ts.Node, out: Array<{ expr: string; type: string }>): void {
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const lt = this.exprType(node.left)
      const rt = this.exprType(node.right)
      if (lt === 'string' || rt === 'string') {
        this.flattenConcat(node.left, out)
        this.flattenConcat(node.right, out)
        return
      }
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'String') {
      out.push({ expr: this.emitExpr(node.arguments[0]), type: 'number' })
      return
    }
    out.push({ expr: this.emitExpr(node), type: this.exprType(node) || 'string' })
  }

  private tryCharCompare(left: ts.Node, right: ts.Node, negate: boolean): string | null {
    const slice = this.extractCharSlice(left) || this.extractCharSlice(right)
    const lit = this.extractCharLit(left) || this.extractCharLit(right)
    if (slice && lit) {
      const pre = negate ? '!' : ''
      // Direct char compare: str_at(s, i) == 'x'
      return `${pre}(str_at(${slice.str}, (int)(${slice.idx})) == '${lit}')`
    }
    return null
  }

  private extractCharSlice(node: ts.Node): { str: string; idx: string } | null {
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return null
    if (node.expression.name.text !== 'slice' || node.arguments.length !== 2) return null
    const start = node.arguments[0], end = node.arguments[1]
    if (ts.isBinaryExpression(end) && end.operatorToken.kind === ts.SyntaxKind.PlusToken &&
        ts.isNumericLiteral(end.right) && end.right.text === '1' &&
        start.getText() === end.left.getText()) {
      return { str: this.emitExpr(node.expression.expression), idx: this.emitExpr(start) }
    }
    return null
  }

  private extractCharLit(node: ts.Node): string | null {
    if (ts.isStringLiteral(node) && node.text.length === 1) {
      const c = node.text
      if (c === '\\') return '\\\\'
      if (c === '\'') return '\\\''
      if (c === '\n') return '\\n'
      if (c === '\t') return '\\t'
      return c
    }
    return null
  }

  private emitFilter(call: ts.CallExpression, objExpr: string, arrType: string): string {
    const fn = call.arguments[0]
    const innerType = arrType.replace('[]', '')
    const elemCType = this.arrayCElemType(arrType)
    const arrTypeName = this.arrayTypeName(innerType)
    const callback = this.emitPredicateCallback(fn, innerType)
    if (!callback) return `/* unsupported filter */${objExpr}`
    const { paramName, body: cond } = callback
    const id = this.lambdaCounter++
    return `({ ${arrTypeName} _r${id} = ${arrTypeName}_new(); ` +
      `for (int _i${id} = 0; _i${id} < ${objExpr}.len; _i${id}++) { ` +
      `${elemCType} ${paramName} = ${objExpr}.data[_i${id}]; ` +
      `if (${cond}) ${arrTypeName}_push(&_r${id}, ${paramName}); } ` +
      `_r${id}; })`
  }

  private emitObjLit(node: ts.ObjectLiteralExpression): string {
    const fields = node.properties
      .filter(ts.isPropertyAssignment)
      .map(p => {
        const name = p.name!.getText()
        let val = this.emitExpr(p.initializer)

        // Empty array in object context
        if (ts.isArrayLiteralExpression(p.initializer) && p.initializer.elements.length === 0) {
          for (const s of this.structs) {
            const f = s.fields.find(x => x.name === name)
            if (f && f.tsType.endsWith('[]')) {
              val = `${this.arrayTypeName(f.tsType.replace('[]', ''))}_new()`
              break
            }
          }
        }

        // Retain array fields being copied into structs (shared ownership)
        for (const s of this.structs) {
          const f = s.fields.find(x => x.name === name)
          if (f && f.tsType.endsWith('[]') && !ts.isArrayLiteralExpression(p.initializer)
              && !val.includes('_new()')) {
            const inner = f.tsType.replace('[]', '')
            val = `${this.arrayTypeName(inner)}_retain(${val})`
          }
          if (f && f.tsType === 'string' && ts.isIdentifier(p.initializer)) {
            val = `str_retain(${val})`
          }
        }

        return `.${name} = ${val}`
      })
    return `{${fields.join(', ')}}`
  }

  private emitTemplate(node: ts.TemplateExpression): string {
    const id = this.lambdaCounter++
    const adds: string[] = []
    if (node.head.text) adds.push(`strbuf_add_cstr(&_t${id}, ${JSON.stringify(node.head.text)})`)
    for (const span of node.templateSpans) {
      const t = this.exprType(span.expression)
      const e = this.emitExpr(span.expression)
      if (t === 'string') adds.push(`strbuf_add_str(&_t${id}, ${e})`)
      else adds.push(`strbuf_add_double(&_t${id}, ${e})`)
      if (span.literal.text) adds.push(`strbuf_add_cstr(&_t${id}, ${JSON.stringify(span.literal.text)})`)
    }
    return `({ STRBUF(_t${id}, 256); ${adds.join('; ')}; strbuf_to_str(&_t${id}); })`
  }

  // ─── Type Inference ─────────────────────────────────────────────

  exprType(node: ts.Node): string | undefined {
    node = this.unwrapParens(node)
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node)) return 'string'
    if (ts.isNumericLiteral(node)) return 'number'
    if (node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword) return 'boolean'
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) return 'JSX.Element'
    if (ts.isIdentifier(node)) return this.varTypes.get(node.text)
    if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression)) {
        const sig = this.funcSigs.get(node.expression.text)
        if (sig) return sig.returnType
        if (node.expression.text === 'String') return 'string'
        if (node.expression.text === 'parseFloat' || node.expression.text === 'parseInt') return 'number'
      }
      if (ts.isPropertyAccessExpression(node.expression)) {
        const m = node.expression.name.text
        if (ts.isIdentifier(node.expression.expression) && node.expression.expression.text === 'Math') return 'number'
        if (m === 'filter' || m === 'slice') return this.exprType(node.expression.expression)
        if (m === 'split') return 'string[]'
        if (m === 'trim' || m === 'trimStart' || m === 'trimEnd' || m === 'join' || m === 'toLowerCase' || m === 'toUpperCase') return 'string'
        if (m === 'indexOf' || m === 'findIndex' || m === 'count' || m === 'sum' || m === 'min' || m === 'max') return 'number'
        if (m === 'includes' || m === 'startsWith' || m === 'endsWith' || m === 'some' || m === 'every') return 'boolean'
      }
    }
    if (ts.isPropertyAccessExpression(node)) {
      if (node.name.text === 'length') return 'number'
      const ot = this.exprType(node.expression)
      if (ot) {
        const s = this.structs.find(x => x.name === ot)
        if (s) { const f = s.fields.find(x => x.name === node.name.text); if (f) return f.tsType }
      }
    }
    if (ts.isBinaryExpression(node)) {
      const op = node.operatorToken.kind
      if (op === ts.SyntaxKind.PlusToken) {
        if (this.exprType(node.left) === 'string' || this.exprType(node.right) === 'string') return 'string'
        return 'number'
      }
      if ([ts.SyntaxKind.MinusToken, ts.SyntaxKind.AsteriskToken, ts.SyntaxKind.SlashToken, ts.SyntaxKind.PercentToken].includes(op)) return 'number'
      if ([ts.SyntaxKind.LessThanToken, ts.SyntaxKind.GreaterThanToken, ts.SyntaxKind.LessThanEqualsToken, ts.SyntaxKind.GreaterThanEqualsToken, ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(op)) return 'boolean'
    }
    if (ts.isElementAccessExpression(node)) {
      const at = this.exprType(node.expression)
      if (at?.endsWith('[]')) return at.slice(0, -2)
    }
    return undefined
  }

  // ─── Statement Generation ───────────────────────────────────────

  private emitStmt(node: ts.Node, out: string[]): void {
    // Source map: emit #line directive
    const sl = this.srcLine(node)
    if (sl) out.push(sl.trimEnd())

    if (ts.isVariableStatement(node)) {
      for (const d of node.declarationList.declarations) this.emitVarDecl(d, out)
      return
    }

    if (ts.isExpressionStatement(node)) {
      // Detect: builderVar = builderVar + ... → strbuf append
      if (ts.isBinaryExpression(node.expression) && node.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
          ts.isIdentifier(node.expression.left) && this.builderVars.has(node.expression.left.text)) {
        const vn = node.expression.left.text
        const rhs = node.expression.right

        // str = "" → just clear the builder (no alloc)
        if (ts.isStringLiteral(rhs) && rhs.text === '') {
          out.push(this.pad() + `strbuf_clear(&_b_${vn});`)
          return
        }

        // str = str + a + b + c → flatten and append each piece
        if (ts.isBinaryExpression(rhs) && this.isBuilderConcat(rhs, vn)) {
          const pieces: ts.Node[] = []
          this.flattenBuilderConcat(rhs, vn, pieces)
          for (const piece of pieces) {
            const cs = this.extractCharSlice(piece)
            if (cs) {
              out.push(this.pad() + `strbuf_add_char(&_b_${vn}, str_at(${cs.str}, (int)(${cs.idx})));`)
            } else {
              const t = this.exprType(piece)
              const e = this.emitExpr(piece)
              if (t === 'number') out.push(this.pad() + `strbuf_add_double(&_b_${vn}, ${e});`)
              else out.push(this.pad() + `strbuf_add_str(&_b_${vn}, ${e});`)
            }
          }
          return
        }
      }

      // Release-on-reassign: save old value, assign new, release old.
      // Must be AFTER assignment because the RHS might reference the old value.
      if (ts.isBinaryExpression(node.expression) &&
          node.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
          ts.isIdentifier(node.expression.left)) {
        const varName = node.expression.left.text
        const varType = this.varTypes.get(varName)

        if (varType === 'string' && !this.builderVars.has(varName)) {
          const tmpId = this.lambdaCounter++
          const rhs = this.emitExpr(node.expression.right)
          out.push(this.pad() + `Str _old${tmpId} = ${varName};`)
          out.push(this.pad() + `${varName} = ${rhs};`)
          out.push(this.pad() + `str_release(&_old${tmpId});`)
          return
        }
        if (varType?.endsWith('[]')) {
          const inner = varType.replace('[]', '')
          const tmpId = this.lambdaCounter++
          const arrTypeName = this.arrayTypeName(inner)
          const rhs = this.emitExpr(node.expression.right)
          out.push(this.pad() + `${arrTypeName} _old${tmpId} = ${varName};`)
          out.push(this.pad() + `${varName} = ${rhs};`)
          if (inner === 'string') out.push(this.pad() + `StrArr_release_deep(&_old${tmpId});`)
          else out.push(this.pad() + `${arrTypeName}_release(&_old${tmpId});`)
          return
        }
      }

      const expr = this.emitExpr(node.expression)
      out.push(this.pad() + expr + ';')
      return
    }

    if (ts.isIfStatement(node)) {
      out.push(this.pad() + `if (${this.emitExpr(node.expression)}) {`)
      this.indent++
      this.emitBlock(node.thenStatement, out)
      this.indent--
      if (node.elseStatement) {
        if (ts.isIfStatement(node.elseStatement)) {
          out.push(this.pad() + `} else`)
          this.emitStmt(node.elseStatement, out)
        } else {
          out.push(this.pad() + `} else {`)
          this.indent++
          this.emitBlock(node.elseStatement, out)
          this.indent--
          out.push(this.pad() + `}`)
        }
      } else {
        out.push(this.pad() + `}`)
      }
      return
    }

    if (ts.isWhileStatement(node)) {
      // Detect string builder patterns
      const builders = ts.isBlock(node.statement) ? this.detectBuilders(node.statement) : []
      for (const v of builders) {
        out.push(this.pad() + `STRBUF(_b_${v}, 4096);`)
        // If the var already has content (not ""), seed the builder with it
        out.push(this.pad() + `strbuf_add_str(&_b_${v}, ${v});`)
        this.builderVars.add(v)
      }
      // Track vars declared before the loop so we can identify loop-locals
      const varsBefore = new Set(this.varTypes.keys())

      out.push(this.pad() + `while (${this.emitExpr(node.expression)}) {`)
      this.indent++
      this.emitBlock(node.statement, out)

      // Emit cleanup for loop-local vars that hold heap data
      this.emitScopeCleanup(varsBefore, out, ts.isBlock(node.statement) ? node.statement : undefined)

      this.indent--
      out.push(this.pad() + `}`)
      for (const v of builders) {
        out.push(this.pad() + `${v} = strbuf_to_heap_str(&_b_${v});`)
        out.push(this.pad() + `strbuf_free(&_b_${v});`)
        this.builderVars.delete(v)
      }
      return
    }

    if (ts.isReturnStatement(node)) {
      // Release function-level vars declared BEFORE this return.
      // Track which vars have been declared by checking the funcDeclaredSoFar set.
      const returnedVar = node.expression && ts.isIdentifier(node.expression) ? node.expression.text : null
      for (const vn of this.funcDeclaredSoFar) {
        if (vn === returnedVar) continue
        if (this.builderVars.has(vn)) continue
        const vt = this.varTypes.get(vn)
        if (!vt) continue
        const releases = this.getReleaseForType(vn, vt)
        for (const r of releases) out.push(this.pad() + r)
      }
      out.push(this.pad() + (node.expression ? `return ${this.emitExpr(node.expression)};` : 'return;'))
      return
    }

    if (ts.isBreakStatement(node)) { out.push(this.pad() + 'break;'); return }
    if (ts.isContinueStatement(node)) { out.push(this.pad() + 'continue;'); return }

    if (ts.isForStatement(node)) {
      let init = ''
      if (node.initializer && ts.isVariableDeclarationList(node.initializer)) {
        for (const d of node.initializer.declarations) {
          const n = d.name.getText(), ct = this.tsTypeToC(d.type)
          init = `${ct} ${n} = ${d.initializer ? this.emitExpr(d.initializer) : '0'}`
          this.varTypes.set(n, this.tsTypeName(d.type))
        }
      }
      out.push(this.pad() + `for (${init}; ${node.condition ? this.emitExpr(node.condition) : ''}; ${node.incrementor ? this.emitExpr(node.incrementor) : ''}) {`)
      this.indent++
      if (node.statement) this.emitBlock(node.statement, out)
      this.indent--
      out.push(this.pad() + `}`)
      return
    }

    out.push(this.pad() + `/* UNSUPPORTED: ${ts.SyntaxKind[node.kind]} */`)
  }

  private emitBlock(node: ts.Node, out: string[]): void {
    if (ts.isBlock(node)) {
      for (const s of node.statements) this.emitStmt(s, out)
    } else {
      this.emitStmt(node, out)
    }
  }

  private emitVarDecl(decl: ts.VariableDeclaration, out: string[]): void {
    if (ts.isArrayBindingPattern(decl.name) && this.isHookCall(decl.initializer)) {
      const elems = decl.name.elements.filter((e): e is ts.BindingElement =>
        !ts.isOmittedExpression(e) && ts.isIdentifier(e.name)
      )
      if (elems.length === 2 && decl.initializer) {
        const valueName = elems[0].name.getText()
        const setterName = elems[1].name.getText()
        const kind = ts.isIdentifier(decl.initializer.expression) && decl.initializer.expression.text === 'useRoute'
          ? 'route'
          : 'state'
        const tsType = this.inferHookTsType(decl.initializer)
        const hook = this.registerHookState(kind, valueName, setterName, tsType)
        this.varTypes.set(valueName, tsType)
        this.varTypes.set(setterName, 'void')
        this.emitHookInitializer(hook, decl.initializer.arguments[0], out)
        return
      }
    }

    const name = decl.name.getText()
    const tsType = this.tsTypeName(decl.type)
    const cType = this.tsTypeToC(decl.type)
    this.varTypes.set(name, tsType)
    this.funcLocalVars.set(name, tsType)
    if (this.funcTopLevelVars.has(name)) this.funcDeclaredSoFar.add(name)

    // Skip require/createRequire
    if (decl.initializer?.getText().includes('require(')) return

    // fs.readFileSync → read_stdin
    if (decl.initializer && ts.isCallExpression(decl.initializer) && decl.initializer.getText().includes('readFileSync')) {
      this.varTypes.set(name, 'string')
      out.push(this.pad() + `OwnedStr _stdin_owned = read_stdin();`)
      out.push(this.pad() + `Str ${name} = str_from(_stdin_owned.data, _stdin_owned.len);`)
      return
    }

    // JSON.parse
    if (decl.initializer && ts.isCallExpression(decl.initializer) && decl.initializer.getText().includes('JSON.parse')) {
      this.needsJsonParser = true
      this.jsonParseTargetType = tsType
      const inner = tsType.replace('[]', '')
      const arrTypeName = this.arrayTypeName(inner)
      const arg = this.emitExpr(decl.initializer.arguments[0])
      out.push(this.pad() + `${arrTypeName} ${name} = json_parse_${inner}_array(${arg});`)
      return
    }

    // Empty array: []
    if (decl.initializer && ts.isArrayLiteralExpression(decl.initializer) && decl.initializer.elements.length === 0) {
      const inner = tsType.replace('[]', '')
      const arrTypeName = this.arrayTypeName(inner)
      out.push(this.pad() + `${arrTypeName} ${name} = ${arrTypeName}_new();`)
      return
    }

    // Array with elements
    if (decl.initializer && ts.isArrayLiteralExpression(decl.initializer) && decl.initializer.elements.length > 0) {
      const inner = tsType.replace('[]', '')
      const arrTypeName = this.arrayTypeName(inner)
      const elemCType = this.arrayCElemType(tsType)
      out.push(this.pad() + `${arrTypeName} ${name} = ${arrTypeName}_new();`)
      for (const el of decl.initializer.elements) {
        const val = ts.isObjectLiteralExpression(el) ? `(${elemCType})${this.emitObjLit(el)}` : this.emitExpr(el)
        out.push(this.pad() + `${arrTypeName}_push(&${name}, ${val});`)
      }
      return
    }

    // Object literal
    if (decl.initializer && ts.isObjectLiteralExpression(decl.initializer)) {
      out.push(this.pad() + `${cType} ${name} = (${cType})${this.emitObjLit(decl.initializer)};`)
      return
    }

    // Default
    if (!decl.initializer) {
      if (cType === 'Str') out.push(this.pad() + `Str ${name} = str_lit("");`)
      else if (cType === 'double') out.push(this.pad() + `double ${name} = 0;`)
      else if (cType === 'bool') out.push(this.pad() + `bool ${name} = false;`)
      else out.push(this.pad() + `${cType} ${name} = {0};`)
    } else {
      out.push(this.pad() + `${cType} ${name} = ${this.emitExpr(decl.initializer)};`)
    }
  }

  // ─── String Builder Detection ─────────────────────────────────

  private detectBuilders(block: ts.Block): string[] {
    // Find ALL string accumulation patterns: str = str + ch
    // No disqualification — reads are handled at emit time via flush/reinit.
    const candidates = new Set<string>()
    const find = (node: ts.Node): void => {
      if (ts.isExpressionStatement(node) && ts.isBinaryExpression(node.expression) &&
          node.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
          ts.isIdentifier(node.expression.left) &&
          ts.isBinaryExpression(node.expression.right) &&
          node.expression.right.operatorToken.kind === ts.SyntaxKind.PlusToken &&
          ts.isIdentifier(node.expression.right.left) &&
          node.expression.right.left.text === node.expression.left.text &&
          this.varTypes.get(node.expression.left.text) === 'string') {
        candidates.add(node.expression.left.text)
      }
      ts.forEachChild(node, find)
    }
    for (const s of block.statements) find(s)
    return [...candidates]
  }

  private emitSort(call: ts.CallExpression, objExpr: string, arrType: string): string {
    const fn = call.arguments[0]
    if (!fn || !ts.isArrowFunction(fn)) return `/* unsupported sort */0`

    const paramA = fn.parameters[0].name.getText()
    const paramB = fn.parameters[1].name.getText()
    const innerType = arrType.replace('[]', '')
    const elemCType = this.arrayCElemType(arrType)

    // Save and set param types
    const prevA = this.varTypes.get(paramA)
    const prevB = this.varTypes.get(paramB)
    this.varTypes.set(paramA, innerType)
    this.varTypes.set(paramB, innerType)

    let body: string
    if (ts.isBlock(fn.body)) {
      const ret = fn.body.statements.find(s => ts.isReturnStatement(s)) as ts.ReturnStatement | undefined
      body = ret?.expression ? this.emitExpr(ret.expression) : '0'
    } else {
      body = this.emitExpr(fn.body)
    }

    // Restore
    if (prevA) this.varTypes.set(paramA, prevA); else this.varTypes.delete(paramA)
    if (prevB) this.varTypes.set(paramB, prevB); else this.varTypes.delete(paramB)

    // Lift comparator to top-level function
    const cmpName = `_cmp_${this.lambdaCounter++}`
    this.lambdas.push(
      `static int ${cmpName}(const void *_a, const void *_b) {\n` +
      `    ${elemCType} ${paramA} = *(const ${elemCType}*)_a;\n` +
      `    ${elemCType} ${paramB} = *(const ${elemCType}*)_b;\n` +
      `    double _r = ${body};\n` +
      `    return _r < 0 ? -1 : _r > 0 ? 1 : 0;\n` +
      `}`
    )

    // Emit qsort call (sorts in place)
    return `qsort(${objExpr}.data, ${objExpr}.len, sizeof(${elemCType}), ${cmpName})`
  }

  // ─── Scope Cleanup (lifetime analysis) ──────────────────────────
  //
  // At the end of each loop iteration, free variables that hold heap data.
  // This is static lifetime analysis — we KNOW these vars die at scope exit.

  private emitScopeCleanup(varsBefore: Set<string>, out: string[], block?: ts.Block): void {
    if (!block) return

    // Release all vars declared directly in this block
    for (const stmt of block.statements) {
      if (!ts.isVariableStatement(stmt)) continue
      for (const d of stmt.declarationList.declarations) {
        const name = d.name.getText()
        if (this.builderVars.has(name)) continue
        const tsType = this.varTypes.get(name)
        if (!tsType) continue

        const releases = this.getReleaseForType(name, tsType)
        for (const r of releases) out.push(this.pad() + r)
      }
    }
  }

  // Generate rc_release calls for a variable based on its type.
  // With refcounting, shared arrays are safe — release decrements rc,
  // only frees when rc hits 0.
  private getReleaseForType(varName: string, tsType: string): string[] {
    // Array types → release the array
    if (tsType.endsWith('[]')) {
      const inner = tsType.replace('[]', '')
      if (inner === 'string') return [`StrArr_release_deep(&${varName});`]
      return [`${this.arrayTypeName(inner)}_release(&${varName});`]
    }

    // String locals: DON'T release. Most are borrowed (copies from arrays,
    // slices, literals). Only strings from str_rc_new/strbuf_to_heap_str own
    // a reference, and those are typically returned or pushed — not left as locals.
    // Releasing borrowed Strs would corrupt the source's refcount.
    if (tsType === 'string') return []

    // Struct types → release array fields, deep-release if elements contain strings.
    const s = this.structs.find(x => x.name === tsType)
    if (s) {
      const lines: string[] = []
      for (const f of s.fields) {
        if (f.tsType.endsWith('[]')) {
          const inner = f.tsType.replace('[]', '')
          if (inner === 'string') {
            lines.push(`StrArr_release_deep(&${varName}.${f.name});`)
          } else {
            // Check if the inner struct has string fields that need releasing
            const innerStruct = this.structs.find(x => x.name === inner)
            if (innerStruct && innerStruct.fields.some(ff => ff.tsType === 'string')) {
              // Release strings inside each element before releasing the array
              const arrTypeName = this.arrayTypeName(inner)
              lines.push(`{ RcHeader *_h = rc_header(${varName}.${f.name}.data);`)
              lines.push(`  if (_h->rc <= 1) {`)
              lines.push(`    for (int _ci = 0; _ci < ${varName}.${f.name}.len; _ci++) {`)
              for (const ff of innerStruct.fields) {
                if (ff.tsType === 'string') lines.push(`      str_release(&${varName}.${f.name}.data[_ci].${ff.name});`)
              }
              lines.push(`    }`)
              lines.push(`  }`)
              lines.push(`  ${arrTypeName}_release(&${varName}.${f.name}); }`)
            } else {
              lines.push(`${this.arrayTypeName(inner)}_release(&${varName}.${f.name});`)
            }
          }
        }
      }
      return lines
    }

    return []
  }

  // Check if a binary expression is a concat chain starting with the builder var
  private isBuilderConcat(node: ts.BinaryExpression, varName: string): boolean {
    if (node.operatorToken.kind !== ts.SyntaxKind.PlusToken) return false
    if (ts.isIdentifier(node.left) && node.left.text === varName) return true
    if (ts.isBinaryExpression(node.left)) return this.isBuilderConcat(node.left, varName)
    // Also handle: strbuf_to_str reference (from emitExpr of builder var)
    return false
  }

  // Flatten str + a + b + c into [a, b, c] (skip the leading var reference)
  private flattenBuilderConcat(node: ts.BinaryExpression, varName: string, pieces: ts.Node[]): void {
    if (ts.isBinaryExpression(node.left) && node.left.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      this.flattenBuilderConcat(node.left, varName, pieces)
    } else if (ts.isIdentifier(node.left) && node.left.text === varName) {
      // This is the leading var reference — skip it
    } else {
      pieces.push(node.left)
    }
    pieces.push(node.right)
  }

  // ─── Function Generation ────────────────────────────────────────

  private emitFunction(node: ts.FunctionDeclaration): void {
    if (!node.name) return
    // Skip 'declare function' — ambient declarations with no body
    if (!node.body) return
    const name = node.name.text

    // Replace readStdin
    if (name === 'readStdin') {
      this.funcSigs.set('readStdin', { name, params: [], returnType: 'string', returnCType: 'Str' })
      this.functions.push('Str readStdin(void) {\n    OwnedStr o = read_stdin();\n    return str_from(o.data, o.len);\n}')
      return
    }

    this.funcLocalVars.clear()
    this.funcTopLevelVars.clear()
    this.funcDeclaredSoFar.clear()
    this.identifierAliases.clear()

    const retInfo = this.inferFunctionReturnType(node)
    const retCType = retInfo.cType
    const retType = retInfo.tsType
    const params: FuncSig['params'] = []
    const paramStrs: string[] = []
    const paramInfos = node.parameters.map((p, index) => this.describeParameter(p, index))
    for (const info of paramInfos) {
      params.push({ name: info.name, tsType: info.tsType, cType: info.cType })
      paramStrs.push(`${info.cType} ${info.name}`)
      this.varTypes.set(info.name, info.tsType)
      for (const alias of info.aliases) this.varTypes.set(alias.name, alias.tsType)
    }
    this.funcSigs.set(name, { name, params, returnType: retType, returnCType: retCType })

    // Pre-scan function body for top-level var declarations
    if (node.body) {
      for (const s of node.body.statements) {
        if (ts.isVariableStatement(s)) {
          for (const d of s.declarationList.declarations)
            if (ts.isIdentifier(d.name)) this.funcTopLevelVars.add(d.name.text)
        }
      }
    }

    const body: string[] = []
    if (node.body) this.withStmtSink(body, () => {
      this.indent = 1
      for (const info of paramInfos) {
        for (const alias of info.aliases) {
          body.push(this.pad() + `${alias.cType} ${alias.name} = ${alias.accessExpr};`)
        }
      }
      for (const s of node.body!.statements) this.emitStmt(s, body)
      this.indent = 0
    })
    const ps = paramStrs.length ? paramStrs.join(', ') : 'void'
    const fnLine = this.srcLine(node)
    this.functions.push(`${fnLine}${retCType} ${name}(${ps}) {\n${body.join('\n')}\n}`)
  }

  // ─── JSON Parser Generator ─────────────────────────────────────

  private genJsonParser(): string {
    const inner = this.jsonParseTargetType.replace('[]', '')
    const s = this.structs.find(x => x.name === inner)
    if (!s) return `/* no struct ${inner} */`
    const arrTypeName = this.arrayTypeName(inner)
    const lines: string[] = []
    lines.push(`${arrTypeName} json_parse_${inner}_array(Str input) {`)
    lines.push(`    ${arrTypeName} arr = ${arrTypeName}_new();`)
    lines.push(`    const char *s = input.data;`)
    lines.push(`    int pos = json_skip_ws(s, 0);`)
    lines.push(`    if (s[pos] != '[') return arr;`)
    lines.push(`    pos++;`)
    lines.push(`    while (1) {`)
    lines.push(`        pos = json_skip_ws(s, pos);`)
    lines.push(`        if (s[pos] == ']') break;`)
    lines.push(`        if (s[pos] == ',') { pos++; continue; }`)
    lines.push(`        ${inner} obj; memset(&obj, 0, sizeof(obj));`)
    lines.push(`        if (s[pos] != '{') break;`)
    lines.push(`        pos++;`)
    lines.push(`        while (1) {`)
    lines.push(`            pos = json_skip_ws(s, pos);`)
    lines.push(`            if (s[pos] == '}') { pos++; break; }`)
    lines.push(`            if (s[pos] == ',') { pos++; continue; }`)
    lines.push(`            Str key; pos = json_parse_string(s, pos, &key);`)
    lines.push(`            pos = json_skip_ws(s, pos); pos++;`)
    lines.push(`            pos = json_skip_ws(s, pos);`)
    for (const f of s.fields) {
      const cond = `if (key.len == ${f.name.length} && memcmp(key.data, "${f.name}", ${f.name.length}) == 0)`
      if (f.tsType === 'string') lines.push(`            ${cond} pos = json_parse_string(s, pos, &obj.${f.name});`)
      else if (f.tsType === 'number') lines.push(`            ${cond} pos = json_parse_number(s, pos, &obj.${f.name});`)
      else if (f.tsType === 'boolean') lines.push(`            ${cond} pos = json_parse_bool(s, pos, &obj.${f.name});`)
      lines.push(`            else`)
    }
    lines.push(`            { if (s[pos]=='"'){Str d;pos=json_parse_string(s,pos,&d);}else if(s[pos]=='t'||s[pos]=='f'){bool d;pos=json_parse_bool(s,pos,&d);}else{double d;pos=json_parse_number(s,pos,&d);} }`)
    lines.push(`        }`)
    lines.push(`        ${arrTypeName}_push(&arr, obj);`)
    lines.push(`    }`)
    lines.push(`    return arr;`)
    lines.push(`}`)
    return lines.join('\n')
  }

  // ─── Helpers ────────────────────────────────────────────────────

  pad(): string { return '    '.repeat(this.indent) }

  /** Emit a #line directive mapping C back to TypeScript source */
  srcLine(node: ts.Node): string {
    if (!this.sourceFile) return ''
    const pos = this.sourceFile.getLineAndCharacterOfPosition(node.getStart())
    return `#line ${pos.line + 1} "${this.sourceFileName}"\n`
  }

  /** Check if a statement should be skipped (import/export/require) */
  private isSkippable(s: ts.Statement): boolean {
    if (ts.isImportDeclaration(s)) return true
    if (ts.isExportDeclaration(s)) return true
    if (ts.isVariableStatement(s) && s.getText().includes('require')) return true
    return false
  }

  // ─── Main Entry ─────────────────────────────────────────────────

  generate(sourceFiles: ts.SourceFile[]): string {
    // Pass 1: interfaces from ALL files
    for (const sf of sourceFiles) {
      for (const s of sf.statements) {
        if (ts.isInterfaceDeclaration(s)) this.emitInterface(s)
      }
    }

    // Pass 1.5: pre-collect all function signatures from ALL files
    for (const sf of sourceFiles) {
      for (const s of sf.statements) {
        if (ts.isFunctionDeclaration(s) && s.name && s.body) {
          const name = s.name.text
          const retInfo = this.inferFunctionReturnType(s)
          const params = s.parameters.map((p, index) => {
            const info = this.describeParameter(p, index)
            return { name: info.name, tsType: info.tsType, cType: info.cType }
          })
          this.funcSigs.set(name, { name, params, returnType: retInfo.tsType, returnCType: retInfo.cType })
        }
      }
    }

    // Pass 2: functions from ALL files (update source mapping per file)
    for (const sf of sourceFiles) {
      this.sourceFile = sf
      this.sourceFileName = sf.fileName
      for (const s of sf.statements) {
        if (ts.isFunctionDeclaration(s)) this.emitFunction(s)
        if (this.isSkippable(s)) continue
      }
    }

    // Pass 2.5: top-level variables from non-entry library files → globals
    // (so functions in other files can reference them)
    const entryFile = sourceFiles[sourceFiles.length - 1]
    for (const sf of sourceFiles) {
      if (sf === entryFile) continue // entry file handled in Pass 3
      this.sourceFile = sf
      this.sourceFileName = sf.fileName
      for (const s of sf.statements) {
        if (!ts.isVariableStatement(s)) continue
        if (this.isSkippable(s)) continue
        for (const d of s.declarationList.declarations) {
          const name = d.name.getText()
          const cType = d.type ? this.tsTypeToC(d.type) : this.inferVarType(d)
          const tsType = d.type ? this.tsTypeName(d.type) : this.inferVarTsType(d)
          this.jsxGlobals.push(`${cType} ${name};`)
          this.varTypes.set(name, tsType)
        }
      }
    }

    // Pass 3: top-level statements from entry file → main()
    this.sourceFile = entryFile
    this.sourceFileName = entryFile.fileName

    let hasTopLevelJsx = false
    for (const s of entryFile.statements) {
      if (ts.isFunctionDeclaration(s) || ts.isInterfaceDeclaration(s) || this.isSkippable(s)) continue
      if (ts.isExpressionStatement(s)) {
        const expr = s.expression
        if (ts.isJsxElement(expr) || ts.isJsxSelfClosingElement(expr) || ts.isJsxFragment(expr)) {
          hasTopLevelJsx = true
          break
        }
      }
    }

    if (hasTopLevelJsx) {
      // Emit entry file's top-level variables as globals
      for (const s of entryFile.statements) {
        if (!ts.isVariableStatement(s)) continue
        for (const d of s.declarationList.declarations) {
          if (!ts.isIdentifier(d.name)) continue
          const name = d.name.getText()
          const cType = d.type ? this.tsTypeToC(d.type) : this.inferVarType(d)
          this.jsxGlobals.push(`${cType} ${name};`)
          this.varTypes.set(name, d.type ? this.tsTypeName(d.type) : this.inferVarTsType(d))
        }
      }

      // main() boot path — init library globals, then entry globals, then one-time expressions
      this.indent = 1
      this.jsxBootStmts = []
      this.withStmtSink(this.jsxBootStmts, () => {
        this.jsxBootStmts.push(this.pad() + 'ui_init();')

        for (const sf of sourceFiles) {
          if (sf === entryFile) continue
          this.sourceFile = sf
          this.sourceFileName = sf.fileName
          for (const s of sf.statements) {
            if (!ts.isVariableStatement(s) || this.isSkippable(s)) continue
            for (const d of s.declarationList.declarations) {
              if (d.initializer && ts.isIdentifier(d.name)) {
                const name = d.name.getText()
                const cType = d.type ? this.tsTypeToC(d.type) : this.inferVarType(d)
                const val = ts.isObjectLiteralExpression(d.initializer)
                  ? `(${cType})${this.emitObjLit(d.initializer)}`
                  : this.emitExpr(d.initializer)
                this.jsxBootStmts.push(this.pad() + `${name} = ${val};`)
              }
            }
          }
        }

        this.sourceFile = entryFile
        this.sourceFileName = entryFile.fileName
        for (const s of entryFile.statements) {
          if (ts.isFunctionDeclaration(s) || ts.isInterfaceDeclaration(s) || this.isSkippable(s)) continue

          if (ts.isVariableStatement(s)) {
            for (const d of s.declarationList.declarations) {
              if (d.initializer && ts.isIdentifier(d.name)) {
                const name = d.name.getText()
                const cType = d.type ? this.tsTypeToC(d.type) : this.inferVarType(d)
                const val = ts.isObjectLiteralExpression(d.initializer)
                  ? `(${cType})${this.emitObjLit(d.initializer)}`
                  : this.emitExpr(d.initializer)
                this.jsxBootStmts.push(this.pad() + `${name} = ${val};`)
              }
            }
            continue
          }

          if (ts.isExpressionStatement(s)) {
            const expr = s.expression
            if (!(ts.isJsxElement(expr) || ts.isJsxSelfClosingElement(expr) || ts.isJsxFragment(expr)))
              this.jsxBootStmts.push(this.pad() + `${this.emitExpr(expr)};`)
          }
        }
        this.indent = 0
      })

      const renderBody: string[] = []
      this.indent = 1
      this.withStmtSink(renderBody, () => {
        renderBody.push(this.pad() + 'UIHandle _jsx_root = NULL;')
        this.sourceFile = entryFile
        this.sourceFileName = entryFile.fileName
        for (const s of entryFile.statements) {
          if (!ts.isExpressionStatement(s)) continue
          const expr = s.expression
          if (ts.isJsxElement(expr) || ts.isJsxSelfClosingElement(expr) || ts.isJsxFragment(expr)) {
            const rendered = this.emitExpr(expr)
            if (rendered) renderBody.push(this.pad() + `_jsx_root = ${rendered};`)
          }
        }
        renderBody.push(this.pad() + 'return _jsx_root;')
        this.indent = 0
      })

      this.functions.push(`static UIHandle _ts_render_root(void) {\n${renderBody.join('\n')}\n}`)
      if (this.hookStates.length > 0) {
        this.functions.push(
          `static void _ts_rerender(void) {\n` +
          `    UIHandle _jsx_root = _ts_render_root();\n` +
          `    if (_jsx_root) ui_replace_root(_jsx_root);\n` +
          `}`
        )
      }
    }

    // Build output
    const L: string[] = []
    L.push('/* Generated by StrictTS Compiler v3 */')
    L.push('#include "runtime.h"')
    if (this.hasJsx) {
      L.push('#include "ui.h"')
    }
    L.push('')

    // Emit all structs first (simple fields only — no array fields yet)
    // Then DEFINE_ARRAY macros, then re-typedef structs that use array fields.
    // Simple approach: emit ALL structs, then ALL arrays.
    // Structs with array-type fields use forward-declared array types.

    // Topological sort: structs that only depend on runtime/builtin arrays
    // first, then custom DEFINE_ARRAY macros, then structs that depend on
    // those custom array typedefs.
    const simpleStructs: StructDef[] = []
    const complexStructs: StructDef[] = []
    for (const s of this.structs) {
      const needsCustomArrayType = s.fields.some(f =>
        f.cType.endsWith('Arr') &&
        f.cType !== 'StrArr' &&
        f.cType !== 'DoubleArr'
      )
      if (needsCustomArrayType) complexStructs.push(s)
      else simpleStructs.push(s)
    }

    // 1. Simple structs (no array fields)
    for (const s of simpleStructs)
      L.push(`typedef struct { ${s.fields.map(f => `${f.cType} ${f.name};`).join(' ')} } ${s.name};`)

    // 2. DEFINE_ARRAY for all types
    for (const t of this.arrayTypes) {
      if (t === 'Str' || t === 'double') continue
      L.push(`DEFINE_ARRAY(${t}Arr, ${t})`)
    }

    // 3. Complex structs (with array fields) — now array types are defined
    for (const s of complexStructs)
      L.push(`typedef struct { ${s.fields.map(f => `${f.cType} ${f.name};`).join(' ')} } ${s.name};`)

    if (this.structs.length) L.push('')

    // JSON parser
    if (this.needsJsonParser) { L.push(this.genJsonParser()); L.push('') }

    // Global variables (JSX mode — top-level const/let)
    if (this.jsxGlobals.length) {
      for (const g of this.jsxGlobals) L.push(g)
      L.push('')
    }

    if (this.hookStates.length) {
      for (const hook of this.hookStates) {
        L.push(`bool ${hook.initSymbol} = false;`)
        L.push(`${hook.cType} ${hook.valueSymbol} = ${this.zeroInitForType(hook.tsType, hook.cType)};`)
      }
      L.push('')
    }

    // Forward declarations (use typedef names, not struct X)
    for (const [name, sig] of this.funcSigs) {
      if (name === 'main') continue
      const fixType = (t: string) => t.startsWith('struct ') ? t.replace('struct ', '') : t
      const ps = sig.params.map(p => `${fixType(p.cType)} ${p.name}`).join(', ') || 'void'
      L.push(`${fixType(sig.returnCType)} ${name}(${ps});`)
    }
    if (this.funcSigs.size) L.push('')

    if (this.hasJsx && this.hookStates.length) {
      L.push('static void _ts_rerender(void);')
      L.push('')
      for (const hook of this.hookStates) {
        const nextValue = hook.tsType === 'string'
          ? `str_retain(_next)`
          : hook.tsType.endsWith('[]')
            ? `${this.arrayTypeName(hook.tsType.replace('[]', ''))}_retain(_next)`
            : '_next'
        const releaseLines = this.getReleaseForType('_old', hook.tsType)
        const body: string[] = []
        body.push(`static void ${hook.applySymbol}(${hook.cType} _next) {`)
        body.push(`    ${hook.cType} _old = ${hook.valueSymbol};`)
        body.push(`    ${hook.valueSymbol} = ${nextValue};`)
        body.push(`    ${hook.initSymbol} = true;`)
        for (const line of releaseLines) body.push(`    ${line}`)
        body.push('    _ts_rerender();')
        body.push('}')
        L.push(body.join('\n'))
        L.push('')
      }
    }

    // Lambdas
    for (const l of this.lambdas) { L.push(l); L.push('') }

    // Functions
    for (const f of this.functions) {
      L.push(f.includes('void main(') ? f.replace('void main(void)', 'void ts_main(void)') : f)
      L.push('')
    }

    // C main
    if (this.hasJsx && hasTopLevelJsx) {
      // JSX app — main() contains ui_init + JSX tree + ui_run
      L.push('int main(int argc, char **argv) {')
      L.push('    ts_install_crash_handler(argv[0]);')
      for (const s of this.jsxBootStmts) L.push(s)
      L.push('    UIHandle _jsx_root = _ts_render_root();')
      L.push('    if (_jsx_root) ui_run(_jsx_root);')
      L.push('    return 0;')
      L.push('}')
    } else if (this.funcSigs.has('main')) {
      L.push('int main(int argc, char **argv) {')
      L.push('    ts_install_crash_handler(argv[0]);')
      L.push('    ts_main();')
      L.push('    return 0;')
      L.push('}')
    }

    return L.join('\n')
  }
}

export function generateC(sourceFiles: ts.SourceFile[], name: string): string {
  return new CodeGen().generate(sourceFiles)
}

/** Backward-compatible single-file entry point */
export function generateCSingle(sf: ts.SourceFile, name: string): string {
  return new CodeGen().generate([sf])
}
