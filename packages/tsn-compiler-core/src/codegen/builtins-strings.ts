import * as ts from 'typescript'

import type { BuiltinEmitterContext } from './shared.js'

/**
 * String methods available on every `string` value in TSN.
 *
 * All methods compile to direct C function calls on the Str type.
 * Most string operations are zero-allocation — slices share the
 * source buffer's refcount. Methods that produce new strings
 * (replace, replaceAll, repeat, toLowerCase, toUpperCase) allocate
 * a heap-backed refcounted buffer.
 *
 * @page stdlib/strings
 * @section overview
 * @syntax s.slice(0, 5) | s.indexOf("x") | s.includes("y") | s.split(",") | s.trim() | s.replace("a", "b") | s.repeat(3)
 * @compilesTo Direct C calls: str_slice, str_indexOf, str_includes,
 * str_split, str_trim, str_replace, str_repeat, etc. Zero-copy where
 * possible (slices share source refcount), heap alloc for transforms.
 * @example
 * const name = "  Alice Smith  ".trim()
 * const parts = name.split(" ")
 * const lower = name.toLowerCase()
 * const replaced = name.replace("Alice", "Bob")
 * const stars = "*".repeat(10)
 * @since 0.1.0
 */
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
  if (method === 'replace' && args.length >= 2) return `str_replace(${objExpr}, ${ctx.emitExpr(args[0])}, ${ctx.emitExpr(args[1])})`
  if (method === 'replaceAll' && args.length >= 2) return `str_replaceAll(${objExpr}, ${ctx.emitExpr(args[0])}, ${ctx.emitExpr(args[1])})`
  if (method === 'repeat' && args.length >= 1) return `str_repeat(${objExpr}, (int)(${ctx.emitExpr(args[0])}))`
  if (method === 'match' && args.length >= 1) return `str_match(${objExpr}, ${ctx.emitExpr(args[0])})`
  if (method === 'search' && args.length >= 1) return `str_search(${objExpr}, ${ctx.emitExpr(args[0])})`

  return null
}
