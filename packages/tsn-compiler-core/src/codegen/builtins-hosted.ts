import * as ts from 'typescript'

import type { HostedBuiltinEmitterContext } from './shared.js'

// Hosted async builtins are intentionally a narrow bridge right now.
// They make Promise<T>-returning I/O callable from TSN source without
// pretending that async/await lowering already exists.
//
// Current behavior:
// - sync builtins lower directly to ts_* runtime helpers
// - async builtins lower to ts_*Async helpers emitted in generated C
// - those helpers currently resolve immediately from the sync runtime call
//
// Edge cases to tackle in later async passes:
// - actual event-loop-backed completion instead of immediate resolution
// - rejection/error propagation instead of silent "best effort" sync wrappers
// - retain/release rules for resolved Str / StrArr / future class payloads
// - timer APIs (setTimeout/setInterval) and network I/O (fetch/Response)
// - Promise<void> specialization, already-resolved awaits, and multi-await
// - ensuring bare-metal/hosted targets do not accidentally share async APIs
export function emitHostedBuiltinCall(
  ctx: HostedBuiltinEmitterContext,
  node: ts.CallExpression,
): string | null {
  if (!ts.isIdentifier(node.expression)) return null

  switch (node.expression.text) {
    case 'readFile':
      return `ts_readFile(${ctx.emitExpr(node.arguments[0])})`
    case 'writeFile':
      return `ts_writeFile(${ctx.emitExpr(node.arguments[0])}, ${ctx.emitExpr(node.arguments[1])})`
    case 'appendFile':
      return `ts_appendFile(${ctx.emitExpr(node.arguments[0])}, ${ctx.emitExpr(node.arguments[1])})`
    case 'fileExists':
      return `ts_fileExists(${ctx.emitExpr(node.arguments[0])})`
    case 'fileSize':
      return `ts_fileSize(${ctx.emitExpr(node.arguments[0])})`
    case 'listDir':
      return `ts_listDir(${ctx.emitExpr(node.arguments[0])})`
    case 'exec':
      return `ts_exec(${ctx.emitExpr(node.arguments[0])})`
    case 'readFileAsync':
      ctx.registerPromiseType('Str')
      return `ts_readFileAsync(${ctx.emitExpr(node.arguments[0])})`
    case 'writeFileAsync':
      ctx.registerPromiseType('void')
      return `ts_writeFileAsync(${ctx.emitExpr(node.arguments[0])}, ${ctx.emitExpr(node.arguments[1])})`
    case 'appendFileAsync':
      ctx.registerPromiseType('void')
      return `ts_appendFileAsync(${ctx.emitExpr(node.arguments[0])}, ${ctx.emitExpr(node.arguments[1])})`
    case 'fileExistsAsync':
      ctx.registerPromiseType('bool')
      return `ts_fileExistsAsync(${ctx.emitExpr(node.arguments[0])})`
    case 'fileSizeAsync':
      ctx.registerPromiseType('double')
      return `ts_fileSizeAsync(${ctx.emitExpr(node.arguments[0])})`
    case 'listDirAsync':
      ctx.registerPromiseType('StrArr')
      return `ts_listDirAsync(${ctx.emitExpr(node.arguments[0])})`
    case 'execAsync':
      ctx.registerPromiseType('double')
      return `ts_execAsync(${ctx.emitExpr(node.arguments[0])})`
    default:
      return null
  }
}

export function appendHostedAsyncHelpers(
  lines: string[],
  promiseTypes: Map<string, string>,
): void {
  // These generated wrappers are a staging step, not the final runtime model.
  // They exist so Promise-returning hosted APIs can be compiled and tested
  // before await/state-machine lowering lands. Once libuv/event-loop support
  // arrives, the helper bodies can switch from "resolve immediately" to
  // "schedule work and resolve later" without changing the TS-facing names.
  const wrappers: string[] = []

  if (promiseTypes.has('Promise_Str')) {
    wrappers.push('static inline Promise_Str ts_readFileAsync(Str path) { return Promise_Str_resolved(ts_readFile(path)); }')
  }
  if (promiseTypes.has('Promise_void')) {
    wrappers.push('static inline Promise_void ts_writeFileAsync(Str path, Str content) { ts_writeFile(path, content); return Promise_void_resolved(); }')
    wrappers.push('static inline Promise_void ts_appendFileAsync(Str path, Str content) { ts_appendFile(path, content); return Promise_void_resolved(); }')
  }
  if (promiseTypes.has('Promise_bool')) {
    wrappers.push('static inline Promise_bool ts_fileExistsAsync(Str path) { return Promise_bool_resolved(ts_fileExists(path)); }')
  }
  if (promiseTypes.has('Promise_double')) {
    wrappers.push('static inline Promise_double ts_fileSizeAsync(Str path) { return Promise_double_resolved(ts_fileSize(path)); }')
    wrappers.push('static inline Promise_double ts_execAsync(Str cmd) { return Promise_double_resolved(ts_exec(cmd)); }')
  }
  if (promiseTypes.has('Promise_StrArr')) {
    wrappers.push('static inline Promise_StrArr ts_listDirAsync(Str path) { return Promise_StrArr_resolved(ts_listDir(path)); }')
  }

  if (wrappers.length > 0) {
    for (const wrapper of wrappers) lines.push(wrapper)
    lines.push('')
  }
}
