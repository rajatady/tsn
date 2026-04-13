import * as ts from 'typescript'

export interface PassOrchestrationContext {
  sourceFile: ts.SourceFile | null
  sourceFileName: string
  functions: string[]
  indent: number
  varTypes: Map<string, string>
  globalDecls: string[]
  classTemplates: Map<string, ts.ClassDeclaration>
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
): { entryFile: ts.SourceFile } {
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
      if (ts.isFunctionDeclaration(s) && s.name && s.body) {
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
        ctx.globalDecls.push(`${cType} ${name};`)
        ctx.varTypes.set(name, tsType)
      }
    }
  }

  ctx.sourceFile = entryFile
  ctx.sourceFileName = entryFile.fileName

  for (const s of entryFile.statements) {
    if (!ts.isVariableStatement(s)) continue
    for (const d of s.declarationList.declarations) {
      if (!ts.isIdentifier(d.name)) continue
      const name = d.name.getText()
      const cType = d.type ? ctx.tsTypeToC(d.type) : ctx.inferVarType(d)
      ctx.globalDecls.push(`${cType} ${name};`)
      ctx.varTypes.set(name, d.type ? ctx.tsTypeName(d.type) : ctx.inferVarTsType(d))
    }
  }
  return { entryFile }
}
