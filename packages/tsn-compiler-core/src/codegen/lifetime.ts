import * as ts from 'typescript'

import type { StructDef } from './types.js'

export interface LifetimeContext {
  builderVars: Set<string>
  varTypes: Map<string, string>
  structs: StructDef[]
  arrayTypeName(innerTsType: string): string
  pad(): string
}

export function detectBuilders(ctx: LifetimeContext, block: ts.Block): string[] {
  const candidates = new Set<string>()
  const find = (node: ts.Node): void => {
    if (
      ts.isExpressionStatement(node) &&
      ts.isBinaryExpression(node.expression) &&
      node.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isIdentifier(node.expression.left) &&
      ts.isBinaryExpression(node.expression.right) &&
      node.expression.right.operatorToken.kind === ts.SyntaxKind.PlusToken &&
      ts.isIdentifier(node.expression.right.left) &&
      node.expression.right.left.text === node.expression.left.text &&
      ctx.varTypes.get(node.expression.left.text) === 'string'
    ) {
      candidates.add(node.expression.left.text)
    }
    ts.forEachChild(node, find)
  }
  for (const s of block.statements) find(s)
  return [...candidates]
}

export function emitScopeCleanup(ctx: LifetimeContext, varsBefore: Set<string>, out: string[], block?: ts.Block): void {
  if (!block) return

  for (const stmt of block.statements) {
    if (!ts.isVariableStatement(stmt)) continue
    for (const d of stmt.declarationList.declarations) {
      const name = d.name.getText()
      if (ctx.builderVars.has(name)) continue
      const tsType = ctx.varTypes.get(name)
      if (!tsType) continue

      const releases = getReleaseForType(ctx, name, tsType)
      for (const r of releases) out.push(ctx.pad() + r)
    }
  }
}

export function getReleaseForType(ctx: LifetimeContext, varName: string, tsType: string): string[] {
  if (tsType.endsWith('[]')) {
    const inner = tsType.replace('[]', '')
    if (inner === 'string') return [`StrArr_release_deep(&${varName});`]
    return [`${ctx.arrayTypeName(inner)}_release(&${varName});`]
  }

  if (tsType === 'string') return []

  const s = ctx.structs.find(x => x.name === tsType)
  if (s) {
    const lines: string[] = []
    for (const f of s.fields) {
      if (f.tsType.endsWith('[]')) {
        const inner = f.tsType.replace('[]', '')
        if (inner === 'string') {
          lines.push(`StrArr_release_deep(&${varName}.${f.name});`)
        } else {
          const innerStruct = ctx.structs.find(x => x.name === inner)
          if (innerStruct && innerStruct.fields.some(ff => ff.tsType === 'string')) {
            const arrTypeName = ctx.arrayTypeName(inner)
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
            lines.push(`${ctx.arrayTypeName(inner)}_release(&${varName}.${f.name});`)
          }
        }
      }
    }
    return lines
  }

  return []
}

export function isBuilderConcat(node: ts.BinaryExpression, varName: string): boolean {
  if (node.operatorToken.kind !== ts.SyntaxKind.PlusToken) return false
  if (ts.isIdentifier(node.left) && node.left.text === varName) return true
  if (ts.isBinaryExpression(node.left)) return isBuilderConcat(node.left, varName)
  return false
}

export function flattenBuilderConcat(node: ts.BinaryExpression, varName: string, pieces: ts.Node[]): void {
  if (ts.isBinaryExpression(node.left) && node.left.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    flattenBuilderConcat(node.left, varName, pieces)
  } else if (ts.isIdentifier(node.left) && node.left.text === varName) {
    // skip leading builder var
  } else {
    pieces.push(node.left)
  }
  pieces.push(node.right)
}
