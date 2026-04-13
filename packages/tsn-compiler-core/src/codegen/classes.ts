import * as ts from 'typescript'

import type { FuncSig } from './func_sig.js'
import type { ClassDef, ClassMethod, StructField } from './types.js'

export interface ClassEmitterContext {
  classDefs: Map<string, ClassDef>
  classTemplates: Map<string, ts.ClassDeclaration>
  funcSigs: Map<string, FuncSig>
  functions: string[]
  structs: Array<{ name: string; fields: StructField[] }>
  varTypes: Map<string, string>
  currentClass: string | null
  indent: number
  funcLocalVars: Map<string, string>
  funcTopLevelVars: Set<string>
  funcDeclaredSoFar: Set<string>
  tsTypeName(typeNode: ts.TypeNode | undefined): string
  tsTypeNameToC(tsType: string, fallback?: string): string
  emitStmt(node: ts.Node, out: string[]): void
}

export function monomorphizeName(ctx: ClassEmitterContext, baseName: string, typeArg: string): string {
  const cArg = ctx.tsTypeNameToC(typeArg, 'double').replace(' *', '').replace('*', '')
  return `${baseName}_${cArg}`
}

export function ensureMonomorphized(ctx: ClassEmitterContext, baseName: string, typeArg: string): string {
  const monoName = monomorphizeName(ctx, baseName, typeArg)
  if (ctx.classDefs.has(monoName)) return monoName
  const template = ctx.classTemplates.get(baseName)
  if (!template || !template.typeParameters) return monoName
  const typeArgs = new Map<string, string>()
  typeArgs.set(template.typeParameters[0].name.text, typeArg)
  parseAndEmitClass(ctx, template, monoName, typeArgs)
  return monoName
}

export function emitClassDeclaration(ctx: ClassEmitterContext, node: ts.ClassDeclaration): void {
  if (!node.name) return
  if (node.typeParameters && node.typeParameters.length > 0) {
    ctx.classTemplates.set(node.name.text, node)
    return
  }
  parseAndEmitClass(ctx, node, node.name.text, new Map())
}

export function parseAndEmitClass(
  ctx: ClassEmitterContext,
  node: ts.ClassDeclaration,
  emitName: string,
  typeArgs: Map<string, string>,
): void {
  const fields: StructField[] = []
  const methods: ClassMethod[] = []
  let hasConstructor = false
  let ctorParams: Array<{ name: string; tsType: string; cType: string }> = []
  let ctorBody: ts.Block | null = null

  const resolveType = (tsType: string): string => {
    if (typeArgs.has(tsType)) return typeArgs.get(tsType)!
    if (tsType.endsWith('[]')) {
      const inner = tsType.replace('[]', '')
      if (typeArgs.has(inner)) return typeArgs.get(inner)! + '[]'
    }
    return tsType
  }

  for (const member of node.members) {
    if (ts.isPropertyDeclaration(member) && member.name) {
      const fname = member.name.getText()
      const tsType = resolveType(member.type ? ctx.tsTypeName(member.type) : 'number')
      fields.push({ name: fname, tsType, cType: ctx.tsTypeNameToC(tsType) })
    }
    if (ts.isConstructorDeclaration(member)) {
      hasConstructor = true
      ctorParams = member.parameters.map((p, i) => {
        const tsType = resolveType(p.type ? ctx.tsTypeName(p.type) : 'number')
        return { name: ts.isIdentifier(p.name) ? p.name.text : `_a${i}`, tsType, cType: ctx.tsTypeNameToC(tsType) }
      })
      ctorBody = member.body ?? null
    }
    if (ts.isMethodDeclaration(member) && member.name) {
      const mname = member.name.getText()
      const isPriv = member.modifiers?.some(m => m.kind === ts.SyntaxKind.PrivateKeyword) ?? false
      const retType = resolveType(member.type ? ctx.tsTypeName(member.type) : 'void')
      const params = member.parameters.map((p, i) => {
        const tsType = resolveType(p.type ? ctx.tsTypeName(p.type) : 'number')
        return { name: ts.isIdentifier(p.name) ? p.name.text : `_a${i}`, tsType, cType: ctx.tsTypeNameToC(tsType) }
      })
      methods.push({
        name: mname,
        params,
        returnTsType: retType,
        returnCType: ctx.tsTypeNameToC(retType, 'void'),
        bodyNode: member.body ?? null,
        isPrivate: isPriv,
      })
    }
  }

  const classDef: ClassDef = {
    name: emitName,
    baseName: node.name?.text ?? emitName,
    fields,
    methods,
    hasConstructor,
    ctorParams,
    ctorBody,
    genericArgs: typeArgs,
  }
  ctx.classDefs.set(emitName, classDef)
  ctx.structs.push({ name: emitName, fields })

  for (const m of methods) {
    const selfParam = { name: 'self', tsType: emitName, cType: `${emitName} *` }
    ctx.funcSigs.set(`${emitName}_${m.name}`, {
      name: `${emitName}_${m.name}`,
      params: [selfParam, ...m.params],
      returnType: m.returnTsType,
      returnCType: m.returnCType,
    })
  }
  ctx.funcSigs.set(`${emitName}_new`, {
    name: `${emitName}_new`,
    params: ctorParams,
    returnType: emitName,
    returnCType: `${emitName} *`,
  })

  const ctorLines: string[] = []
  const ps = ctorParams.length ? ctorParams.map(p => `${p.cType} ${p.name}`).join(', ') : 'void'
  ctorLines.push(`${emitName} *${emitName}_new(${ps}) {`)
  ctorLines.push(`    ${emitName} *self = (${emitName} *)malloc(sizeof(${emitName}));`)
  ctorLines.push(`    memset(self, 0, sizeof(${emitName}));`)

  if (ctorBody) {
    const prevClass = ctx.currentClass
    ctx.currentClass = emitName
    for (const p of ctorParams) ctx.varTypes.set(p.name, p.tsType)
    ctx.indent = 1
    const body: string[] = []
    for (const s of ctorBody.statements) ctx.emitStmt(s, body)
    ctx.indent = 0
    for (const line of body) ctorLines.push(line)
    ctx.currentClass = prevClass
  }
  ctorLines.push(`    return self;`)
  ctorLines.push(`}`)
  ctx.functions.push(ctorLines.join('\n'))

  for (const m of methods) {
    if (!m.bodyNode) continue
    const prevClass = ctx.currentClass
    ctx.currentClass = emitName
    ctx.funcLocalVars.clear()
    ctx.funcTopLevelVars.clear()
    ctx.funcDeclaredSoFar.clear()
    for (const p of m.params) ctx.varTypes.set(p.name, p.tsType)

    const mps = [`${emitName} *self`].concat(m.params.map(p => `${p.cType} ${p.name}`)).join(', ')
    ctx.indent = 1
    const body: string[] = []
    for (const s of m.bodyNode.statements) ctx.emitStmt(s, body)
    ctx.indent = 0

    ctx.functions.push(`${m.returnCType} ${emitName}_${m.name}(${mps}) {\n${body.join('\n')}\n}`)
    ctx.currentClass = prevClass
  }
}
