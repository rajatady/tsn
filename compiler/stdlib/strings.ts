import * as ts from 'typescript'
import type { StdlibEmitterContext } from './shared.js'

export function emitStringMethod(
  ctx: StdlibEmitterContext,
  objExpr: string,
  method: string,
  args: ts.NodeArray<ts.Expression>
): string | null {
  if (method === 'slice') {
    const a = args.map(n => ctx.emitExpr(n))
    return a.length === 1
      ? `str_slice(${objExpr}, (int)(${a[0]}), ${objExpr}.len)`
      : `str_slice(${objExpr}, (int)(${a[0]}), (int)(${a[1]}))`
  }

  if (method === 'indexOf') return `str_indexOf(${objExpr}, ${ctx.emitExpr(args[0])})`
  if (method === 'startsWith') return `str_startsWith(${objExpr}, ${ctx.emitExpr(args[0])})`
  if (method === 'endsWith') return `str_endsWith(${objExpr}, ${ctx.emitExpr(args[0])})`
  if (method === 'includes') return `str_includes(${objExpr}, ${ctx.emitExpr(args[0])})`
  if (method === 'trim') return `str_trim(${objExpr})`
  if (method === 'trimStart') return `str_trim_start(${objExpr})`
  if (method === 'trimEnd') return `str_trim_end(${objExpr})`

  return null
}

