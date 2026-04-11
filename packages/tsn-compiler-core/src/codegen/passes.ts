import * as ts from 'typescript'

export interface PassOrchestrationContext {
  sourceFile: ts.SourceFile | null
  sourceFileName: string
  jsxBootStmts: string[]
  functions: string[]
  indent: number
  varTypes: Map<string, string>
  jsxGlobals: string[]
  classTemplates: Map<string, ts.ClassDeclaration>
  hooks: {
    hasHooks(): boolean
  }
  emitInterface(node: ts.InterfaceDeclaration): void
  inferFunctionReturnType(node: ts.FunctionDeclaration): { tsType: string; cType: string }
  describeParameter(p: ts.ParameterDeclaration, index: number): { name: string; tsType: string; cType: string }
  tsTypeName(typeNode: ts.TypeNode | undefined): string
  tsTypeToC(typeNode: ts.TypeNode | undefined, fallback?: string): string
  inferVarType(decl: ts.VariableDeclaration): string
  inferVarTsType(decl: ts.VariableDeclaration): string
  isSkippable(statement: ts.Statement): boolean
  emitClassDeclaration(node: ts.ClassDeclaration): void
  emitFunction(node: ts.FunctionDeclaration): void
  withStmtSink<T>(sink: string[], fn: () => T): T
  pad(): string
  emitExpr(node: ts.Node): string
  emitObjLit(node: ts.ObjectLiteralExpression, targetStructName?: string): string
}

export function runCompilationPasses(
  ctx: PassOrchestrationContext,
  sourceFiles: ts.SourceFile[],
): { entryFile: ts.SourceFile; hasTopLevelJsx: boolean } {
  for (const sf of sourceFiles) {
    for (const s of sf.statements) {
      if (ts.isInterfaceDeclaration(s)) ctx.emitInterface(s)
    }
  }

  for (const sf of sourceFiles) {
    ctx.sourceFile = sf
    ctx.sourceFileName = sf.fileName
    for (const s of sf.statements) {
      if (ts.isClassDeclaration(s) && s.typeParameters?.length) {
        if (s.name) ctx.classTemplates.set(s.name.text, s)
      }
    }
  }

  for (const sf of sourceFiles) {
    for (const s of sf.statements) {
      if (ts.isFunctionDeclaration(s) && s.name) {
        // Collect signatures for both defined functions and declare functions.
        // declare functions (no body) from native packages get registered here
        // so that calls to them are resolved during codegen.
        const name = s.name.text
        const retInfo = ctx.inferFunctionReturnType(s)
        const params = s.parameters.map((p, index) => {
          const info = ctx.describeParameter(p, index)
          return { name: info.name, tsType: info.tsType, cType: info.cType }
        })
        ;(ctx as any).funcSigs.set(name, { name, params, returnType: retInfo.tsType, returnCType: retInfo.cType })
      }
    }
  }

  for (const sf of sourceFiles) {
    ctx.sourceFile = sf
    ctx.sourceFileName = sf.fileName
    for (const s of sf.statements) {
      if (!ts.isVariableStatement(s) || ctx.isSkippable(s)) continue
      for (const d of s.declarationList.declarations) {
        if (!ts.isIdentifier(d.name)) continue
        const tsType = d.type ? ctx.tsTypeName(d.type) : ctx.inferVarTsType(d)
        ctx.varTypes.set(d.name.text, tsType)
      }
    }
  }

  for (const sf of sourceFiles) {
    ctx.sourceFile = sf
    ctx.sourceFileName = sf.fileName
    for (const s of sf.statements) {
      if (ts.isClassDeclaration(s)) ctx.emitClassDeclaration(s)
      if (ts.isFunctionDeclaration(s)) ctx.emitFunction(s)
      if (ctx.isSkippable(s)) continue
    }
  }

  const entryFile = sourceFiles[sourceFiles.length - 1]
  for (const sf of sourceFiles) {
    if (sf === entryFile) continue
    ctx.sourceFile = sf
    ctx.sourceFileName = sf.fileName
    for (const s of sf.statements) {
      if (!ts.isVariableStatement(s) || ctx.isSkippable(s)) continue
      for (const d of s.declarationList.declarations) {
        const name = d.name.getText()
        const cType = d.type ? ctx.tsTypeToC(d.type) : ctx.inferVarType(d)
        const tsType = d.type ? ctx.tsTypeName(d.type) : ctx.inferVarTsType(d)
        ctx.jsxGlobals.push(`${cType} ${name};`)
        ctx.varTypes.set(name, tsType)
      }
    }
  }

  ctx.sourceFile = entryFile
  ctx.sourceFileName = entryFile.fileName

  let hasTopLevelJsx = false
  for (const s of entryFile.statements) {
    if (ts.isFunctionDeclaration(s) || ts.isInterfaceDeclaration(s) || ctx.isSkippable(s)) continue
    if (ts.isExpressionStatement(s)) {
      const expr = s.expression
      if (ts.isJsxElement(expr) || ts.isJsxSelfClosingElement(expr) || ts.isJsxFragment(expr)) {
        hasTopLevelJsx = true
        break
      }
    }
  }

  for (const s of entryFile.statements) {
    if (!ts.isVariableStatement(s)) continue
    for (const d of s.declarationList.declarations) {
      if (!ts.isIdentifier(d.name)) continue
      const name = d.name.getText()
      const cType = d.type ? ctx.tsTypeToC(d.type) : ctx.inferVarType(d)
      ctx.jsxGlobals.push(`${cType} ${name};`)
      ctx.varTypes.set(name, d.type ? ctx.tsTypeName(d.type) : ctx.inferVarTsType(d))
    }
  }

  if (hasTopLevelJsx) {
    ctx.indent = 1
    ctx.jsxBootStmts = []
    ctx.withStmtSink(ctx.jsxBootStmts, () => {
      ctx.jsxBootStmts.push(ctx.pad() + 'ui_init();')

      for (const sf of sourceFiles) {
        if (sf === entryFile) continue
        ctx.sourceFile = sf
        ctx.sourceFileName = sf.fileName
        for (const s of sf.statements) {
          if (!ts.isVariableStatement(s) || ctx.isSkippable(s)) continue
          for (const d of s.declarationList.declarations) {
            if (d.initializer && ts.isIdentifier(d.name)) {
              const name = d.name.getText()
              const cType = d.type ? ctx.tsTypeToC(d.type) : ctx.inferVarType(d)
              const tsType = d.type ? ctx.tsTypeName(d.type) : ctx.inferVarTsType(d)
              const val = ts.isObjectLiteralExpression(d.initializer)
                ? `(${cType})${ctx.emitObjLit(d.initializer, tsType)}`
                : ctx.emitExpr(d.initializer)
              ctx.jsxBootStmts.push(ctx.pad() + `${name} = ${val};`)
            }
          }
        }
      }

      ctx.sourceFile = entryFile
      ctx.sourceFileName = entryFile.fileName
      for (const s of entryFile.statements) {
        if (ts.isFunctionDeclaration(s) || ts.isInterfaceDeclaration(s) || ctx.isSkippable(s)) continue

        if (ts.isVariableStatement(s)) {
          for (const d of s.declarationList.declarations) {
            if (d.initializer && ts.isIdentifier(d.name)) {
              const name = d.name.getText()
              const cType = d.type ? ctx.tsTypeToC(d.type) : ctx.inferVarType(d)
              const tsType = d.type ? ctx.tsTypeName(d.type) : ctx.inferVarTsType(d)
              const val = ts.isObjectLiteralExpression(d.initializer)
                ? `(${cType})${ctx.emitObjLit(d.initializer, tsType)}`
                : ctx.emitExpr(d.initializer)
              ctx.jsxBootStmts.push(ctx.pad() + `${name} = ${val};`)
            }
          }
          continue
        }

        if (ts.isExpressionStatement(s)) {
          const expr = s.expression
          if (!(ts.isJsxElement(expr) || ts.isJsxSelfClosingElement(expr) || ts.isJsxFragment(expr))) {
            ctx.jsxBootStmts.push(ctx.pad() + `${ctx.emitExpr(expr)};`)
          }
        }
      }
      ctx.indent = 0
    })

    const renderBody: string[] = []
    ctx.indent = 1
    ctx.withStmtSink(renderBody, () => {
      renderBody.push(ctx.pad() + 'UIHandle _jsx_root = NULL;')
      ctx.sourceFile = entryFile
      ctx.sourceFileName = entryFile.fileName
      for (const s of entryFile.statements) {
        if (!ts.isExpressionStatement(s)) continue
        const expr = s.expression
        if (ts.isJsxElement(expr) || ts.isJsxSelfClosingElement(expr) || ts.isJsxFragment(expr)) {
          const rendered = ctx.emitExpr(expr)
          if (rendered) renderBody.push(ctx.pad() + `_jsx_root = ${rendered};`)
        }
      }
      renderBody.push(ctx.pad() + 'return _jsx_root;')
      ctx.indent = 0
    })

    ctx.functions.push(`static UIHandle _ts_render_root(void) {\n${renderBody.join('\n')}\n}`)
    if (ctx.hooks.hasHooks()) {
      ctx.functions.push(
        `static void _ts_rerender(void) {\n` +
        `    UIHandle _jsx_root = _ts_render_root();\n` +
        `    if (_jsx_root) ui_replace_root(_jsx_root);\n` +
        `}`,
      )
    }
  }

  return { entryFile, hasTopLevelJsx }
}
