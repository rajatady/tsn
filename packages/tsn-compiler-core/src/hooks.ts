import * as ts from 'typescript'

export interface HookState {
  kind: 'state' | 'route' | 'store'
  sourceValueName: string
  sourceSetterName: string
  tsType: string
  cType: string
  valueSymbol: string
  initSymbol: string
  applySymbol: string
  storeKey: string
}

interface HookRuntime {
  tsTypeNameToC(tsType: string, fallback?: string): string
  arrayTypeName(innerTsType: string): string
  exprType(node: ts.Node): string | undefined
  emitExpr(node: ts.Node): string
  getReleaseForType(varName: string, tsType: string): string[]
  varTypes: Map<string, string>
  identifierAliases: Map<string, string>
}

export class HookRegistry {
  private hookStates: HookState[] = []
  private hookStatesBySetter: Map<string, HookState> = new Map()
  private hookStatesByStoreKey: Map<string, HookState> = new Map()

  constructor(private readonly runtime: HookRuntime) {}

  hasHooks(): boolean {
    return this.hookStates.length > 0
  }

  emitSetterCall(setterName: string, args: ts.NodeArray<ts.Expression>): string | null {
    const hook = this.hookStatesBySetter.get(setterName)
    if (!hook) return null
    return this.emitHookSetterCall(hook, args)
  }

  tryEmitBindingDeclaration(decl: ts.VariableDeclaration, out: string[], pad: () => string): boolean {
    if (!ts.isArrayBindingPattern(decl.name) || !this.isHookCall(decl.initializer)) return false

    const elems = decl.name.elements.filter((e): e is ts.BindingElement =>
      !ts.isOmittedExpression(e) && ts.isIdentifier(e.name)
    )
    if (elems.length !== 2 || !decl.initializer) return false

    const valueName = elems[0].name.getText()
    const setterName = elems[1].name.getText()
    const kind = this.hookKind(decl.initializer)
    const tsType = this.inferHookTsType(decl.initializer)
    const hook = this.registerHookState(kind, valueName, setterName, tsType, this.hookStoreKey(decl.initializer))

    this.runtime.varTypes.set(valueName, tsType)
    this.runtime.varTypes.set(setterName, 'void')
    this.emitHookInitializer(hook, this.hookInitArg(decl.initializer), out, pad)
    return true
  }

  appendGlobalDeclarations(lines: string[]): void {
    if (!this.hookStates.length) return
    for (const hook of this.hookStates) {
      lines.push(`bool ${hook.initSymbol} = false;`)
      lines.push(`${hook.cType} ${hook.valueSymbol} = ${this.zeroInitForType(hook.tsType, hook.cType)};`)
    }
    lines.push('')
  }

  appendApplyFunctions(lines: string[]): void {
    if (!this.hookStates.length) return
    lines.push('static void _ts_rerender(void);')
    lines.push('')
    for (const hook of this.hookStates) {
      const nextValue = hook.tsType === 'string'
        ? 'str_retain(_next)'
        : hook.tsType.endsWith('[]')
          ? `${this.runtime.arrayTypeName(hook.tsType.replace('[]', ''))}_retain(_next)`
          : '_next'
      const releaseLines = this.runtime.getReleaseForType('_old', hook.tsType)
      const body: string[] = []
      body.push(`static void ${hook.applySymbol}(${hook.cType} _next) {`)
      body.push(`    ${hook.cType} _old = ${hook.valueSymbol};`)
      body.push(`    ${hook.valueSymbol} = ${nextValue};`)
      body.push(`    ${hook.initSymbol} = true;`)
      for (const line of releaseLines) body.push(`    ${line}`)
      body.push('    _ts_rerender();')
      body.push('}')
      lines.push(body.join('\n'))
      lines.push('')
    }
  }

  private isHookCall(node: ts.Expression | undefined): node is ts.CallExpression {
    if (!node || !ts.isCallExpression(node) || !ts.isIdentifier(node.expression)) return false
    return node.expression.text === 'useState' || node.expression.text === 'useRoute' || node.expression.text === 'useStore'
  }

  private hookKind(call: ts.CallExpression): 'state' | 'route' | 'store' {
    if (ts.isIdentifier(call.expression) && call.expression.text === 'useRoute') return 'route'
    if (ts.isIdentifier(call.expression) && call.expression.text === 'useStore') return 'store'
    return 'state'
  }

  private inferHookTsType(call: ts.CallExpression): string {
    if (ts.isIdentifier(call.expression) && call.expression.text === 'useRoute') return 'string'
    if (ts.isIdentifier(call.expression) && call.expression.text === 'useStore') {
      if (call.typeArguments?.length) return this.tsTypeName(call.typeArguments[0])
      if (call.arguments.length > 1) return this.runtime.exprType(call.arguments[1]) ?? 'number'
      return 'number'
    }
    if (call.typeArguments?.length) return this.tsTypeName(call.typeArguments[0])
    if (call.arguments.length > 0) return this.runtime.exprType(call.arguments[0]) ?? 'number'
    return 'number'
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

  private hookInitArg(call: ts.CallExpression): ts.Expression | undefined {
    if (ts.isIdentifier(call.expression) && call.expression.text === 'useStore') return call.arguments[1]
    return call.arguments[0]
  }

  private hookStoreKey(call: ts.CallExpression): string {
    if (ts.isIdentifier(call.expression) && call.expression.text === 'useStore' && call.arguments[0] && ts.isStringLiteral(call.arguments[0])) {
      return call.arguments[0].text
    }
    return ''
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
      return `${this.runtime.arrayTypeName(inner)}_retain(${expr})`
    }
    return expr
  }

  private registerHookState(
    kind: 'state' | 'route' | 'store',
    valueName: string,
    setterName: string,
    tsType: string,
    storeKey = ''
  ): HookState {
    if (kind === 'route') {
      const existing = this.hookStates.find(h => h.kind === 'route')
      if (existing) {
        this.runtime.identifierAliases.set(valueName, existing.valueSymbol)
        this.hookStatesBySetter.set(setterName, existing)
        return existing
      }
    }

    if (kind === 'store' && storeKey.length > 0) {
      const existing = this.hookStatesByStoreKey.get(storeKey)
      if (existing) {
        this.runtime.identifierAliases.set(valueName, existing.valueSymbol)
        this.hookStatesBySetter.set(setterName, existing)
        return existing
      }
    }

    const id = this.hookStates.length
    const cType = this.runtime.tsTypeNameToC(tsType)
    const hook: HookState = {
      kind,
      sourceValueName: valueName,
      sourceSetterName: setterName,
      tsType,
      cType,
      valueSymbol: kind === 'route' ? '_route_state' : `_hook_state_${id}`,
      initSymbol: kind === 'route' ? '_route_init' : `_hook_init_${id}`,
      applySymbol: kind === 'route' ? '_route_navigate' : `_hook_apply_${id}`,
      storeKey,
    }
    this.hookStates.push(hook)
    this.runtime.identifierAliases.set(valueName, hook.valueSymbol)
    this.hookStatesBySetter.set(setterName, hook)
    if (kind === 'store' && storeKey.length > 0) this.hookStatesByStoreKey.set(storeKey, hook)
    return hook
  }

  private emitHookInitializer(
    hook: HookState,
    initExpr: ts.Expression | undefined,
    out: string[],
    pad: () => string
  ): void {
    const initial = initExpr
      ? this.retainForHookType(hook.tsType, this.runtime.emitExpr(initExpr))
      : this.zeroInitForType(hook.tsType, hook.cType)
    out.push(pad() + `if (!${hook.initSymbol}) {`)
    out.push(pad() + `    ${hook.valueSymbol} = ${initial};`)
    out.push(pad() + `    ${hook.initSymbol} = true;`)
    out.push(pad() + '}')
  }

  private emitHookSetterCall(hook: HookState, args: ts.NodeArray<ts.Expression>): string {
    if (args.length === 0) return `${hook.applySymbol}(${hook.valueSymbol})`
    const update = args[0]
    if (ts.isArrowFunction(update) && update.parameters.length > 0) {
      const paramName = update.parameters[0].name.getText()
      const prevType = this.runtime.varTypes.get(paramName)
      const prevAlias = this.runtime.identifierAliases.get(paramName)
      this.runtime.varTypes.set(paramName, hook.tsType)
      this.runtime.identifierAliases.set(paramName, hook.valueSymbol)
      let nextExpr = hook.valueSymbol
      if (ts.isBlock(update.body)) {
        const ret = update.body.statements.find(s => ts.isReturnStatement(s)) as ts.ReturnStatement | undefined
        nextExpr = ret?.expression ? this.runtime.emitExpr(ret.expression) : hook.valueSymbol
      } else {
        nextExpr = this.runtime.emitExpr(update.body)
      }
      if (prevType) this.runtime.varTypes.set(paramName, prevType); else this.runtime.varTypes.delete(paramName)
      if (prevAlias) this.runtime.identifierAliases.set(paramName, prevAlias); else this.runtime.identifierAliases.delete(paramName)
      return `${hook.applySymbol}(${nextExpr})`
    }
    return `${hook.applySymbol}(${this.runtime.emitExpr(update)})`
  }
}
