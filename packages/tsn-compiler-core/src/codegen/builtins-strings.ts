import * as ts from 'typescript'

import type { BuiltinEmitterContext } from './shared.js'

export function emitStringMethod(
  ctx: BuiltinEmitterContext,
  objExpr: string,
  method: string,
  args: ts.NodeArray<ts.Expression>,
): string | null {
  if (method === 'slice') {
    const a = args.map(n => ctx.emitExpr(n))
    return a.length === 1
      ? `str_slice(${objExpr}, (int)(${a[0]}), ${objExpr}.len)`
      : `str_slice(${objExpr}, (int)(${a[0]}), (int)(${a[1]}))`
  }

  if (method === 'indexOf') {
    if (args.length > 1) {
      return `str_indexOf_from(${objExpr}, ${ctx.emitExpr(args[0])}, (int)(${ctx.emitExpr(args[1])}))`
    }
    return `str_indexOf(${objExpr}, ${ctx.emitExpr(args[0])})`
  }
  if (method === 'startsWith') return `str_startsWith(${objExpr}, ${ctx.emitExpr(args[0])})`
  if (method === 'endsWith') return `str_endsWith(${objExpr}, ${ctx.emitExpr(args[0])})`
  if (method === 'includes') return `str_includes(${objExpr}, ${ctx.emitExpr(args[0])})`
  if (method === 'split' && args.length > 0) return `str_split(${objExpr}, ${ctx.emitExpr(args[0])})`
  if (method === 'trim') return `str_trim(${objExpr})`
  if (method === 'trimStart') return `str_trim_start(${objExpr})`
  if (method === 'trimEnd') return `str_trim_end(${objExpr})`
  if (method === 'toLowerCase') return `str_lower_ascii(${objExpr})`
  if (method === 'toUpperCase') return `str_upper_ascii(${objExpr})`
  if (method === 'charCodeAt') return `((double)(unsigned char)str_at(${objExpr}, (int)(${ctx.emitExpr(args[0])})))`

  return null
}
