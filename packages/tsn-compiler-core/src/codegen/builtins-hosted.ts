import * as ts from 'typescript'

import type { HostedBuiltinEmitterContext } from './shared.js'
import { emitTimerBuiltinCall } from './builtins-timers.js'

function parseFetchInit(
  ctx: HostedBuiltinEmitterContext,
  initArg: ts.Expression | undefined,
): { methodExpr: string; bodyExpr: string; headersExpr: string } {
  if (!initArg) return { methodExpr: 'str_lit("GET")', bodyExpr: 'str_lit("")', headersExpr: 'str_lit("")' }
  if (!ts.isObjectLiteralExpression(initArg)) {
    throw new Error('fetch(url, init) currently requires init to be an object literal')
  }

  let methodExpr = 'str_lit("GET")'
  let bodyExpr = 'str_lit("")'
  let headersExpr = 'str_lit("")'

  const emitHeaderBlob = (headersInit: ts.ObjectLiteralExpression): string => {
    const bufId = ctx.nextTempId()
    const bufName = `_fetch_headers_${bufId}`
    const resultName = `_fetch_headers_result_${bufId}`
    const lines: string[] = [`STRBUF(${bufName}, 256)`]
    for (const headerProp of headersInit.properties) {
      if (
        !ts.isPropertyAssignment(headerProp) ||
        (!ts.isIdentifier(headerProp.name) && !ts.isStringLiteral(headerProp.name))
      ) {
        throw new Error('fetch init headers only support plain string-valued properties')
      }
      const headerName = ts.isIdentifier(headerProp.name) ? headerProp.name.text : headerProp.name.text
      const valueExpr = ctx.emitExpr(headerProp.initializer)
      const valueType = ctx.exprType(headerProp.initializer)
      lines.push(`strbuf_add_str(&${bufName}, str_lit(${JSON.stringify(`${headerName}: `)}))`)
      if (valueType === 'number') {
        lines.push(`strbuf_add_double(&${bufName}, ${valueExpr})`)
      } else if (valueType === 'boolean') {
        lines.push(`strbuf_add_str(&${bufName}, ${valueExpr} ? str_lit("true") : str_lit("false"))`)
      } else {
        lines.push(`strbuf_add_str(&${bufName}, ${valueExpr})`)
      }
      lines.push(`strbuf_add_str(&${bufName}, str_lit("\\n"))`)
    }
    lines.push(`Str ${resultName} = strbuf_to_heap_str(&${bufName})`)
    lines.push(`strbuf_free(&${bufName})`)
    lines.push(resultName)
    return `({ ${lines.join('; ')}; })`
  }

  for (const prop of initArg.properties) {
    if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) {
      throw new Error('fetch init only supports plain method/body/headers properties')
    }
    if (prop.name.text === 'method') {
      methodExpr = ctx.emitExpr(prop.initializer)
      continue
    }
    if (prop.name.text === 'body') {
      bodyExpr = ctx.emitExpr(prop.initializer)
      continue
    }
    if (prop.name.text === 'headers') {
      if (!ts.isObjectLiteralExpression(prop.initializer)) {
        throw new Error('fetch init headers must be an object literal for now')
      }
      headersExpr = emitHeaderBlob(prop.initializer)
      continue
    }
    throw new Error(`fetch init property "${prop.name.text}" is not supported yet`)
  }

  return { methodExpr, bodyExpr, headersExpr }
}

// Hosted async builtins are intentionally a narrow bridge right now.
// They make Promise<T>-returning I/O callable from TSN source without
// pretending that async/await lowering already exists.
//
// Current behavior:
// - sync builtins lower directly to ts_* runtime helpers
// - async builtins lower to ts_*Async helpers emitted in generated C
// - those helpers now schedule libuv worker-pool jobs and return pending promises
//
// Edge cases to tackle in later async passes:
// - rejection/error propagation instead of current "best effort" success semantics
// - retain/release rules for resolved Str / StrArr / future class payloads
// - richer timer semantics like captured closures and delay-style promise helpers
// - richer fetch semantics like headers, streaming, cancellation, and Response.json()
// - Promise<void> specialization, already-resolved awaits, and multi-await
// - ensuring bare-metal/hosted targets do not accidentally share async APIs
export function emitHostedBuiltinCall(
  ctx: HostedBuiltinEmitterContext,
  node: ts.CallExpression,
): string | null {
  const timerBuiltin = emitTimerBuiltinCall(ctx, node)
  if (timerBuiltin) return timerBuiltin

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
    case 'fetch': {
      ctx.registerPromiseType('TSFetchResponse')
      const { methodExpr, bodyExpr, headersExpr } = parseFetchInit(ctx, node.arguments[1])
      return `ts_fetch(${ctx.emitExpr(node.arguments[0])}, ${methodExpr}, ${bodyExpr}, ${headersExpr})`
    }
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
  // These generated wrappers are the stable TS-facing bridge for hosted async I/O.
  // The current runtime model is:
  // - create a pending promise
  // - schedule work onto libuv's worker pool
  // - settle the shared promise state in the after-work callback
  //
  // Await still blocks the current TSN frame by pumping the hosted event loop
  // until the promise settles. Later passes can replace that blocking wait with
  // real state-machine suspension without changing the source-level APIs.
  const wrappers: string[] = []

  if (promiseTypes.has('Promise_Str')) {
    wrappers.push('static inline Promise_Str ts_readFileAsync(Str path) { Promise_Str _p = Promise_Str_pending(); ts_schedule_read_file(_p.state, path); return _p; }')
    wrappers.push('static inline Promise_Str ts_response_text(TSFetchResponse response) { return Promise_Str_resolved(str_retain(response.body)); }')
    wrappers.push('static inline Str ts_response_status_text(TSFetchResponse response) { return ts_fetch_status_text(response.status); }')
    wrappers.push('static inline Str ts_response_header(TSFetchResponse response, Str name) { return ts_fetch_header(response, name); }')
  }
  if (promiseTypes.has('Promise_void')) {
    wrappers.push('static inline Promise_void ts_writeFileAsync(Str path, Str content) { Promise_void _p = Promise_void_pending(); ts_schedule_write_file(_p.state, path, content, false); return _p; }')
    wrappers.push('static inline Promise_void ts_appendFileAsync(Str path, Str content) { Promise_void _p = Promise_void_pending(); ts_schedule_write_file(_p.state, path, content, true); return _p; }')
  }
  if (promiseTypes.has('Promise_bool')) {
    wrappers.push('static inline Promise_bool ts_fileExistsAsync(Str path) { Promise_bool _p = Promise_bool_pending(); ts_schedule_file_exists(_p.state, path); return _p; }')
  }
  if (promiseTypes.has('Promise_double')) {
    wrappers.push('static inline Promise_double ts_fileSizeAsync(Str path) { Promise_double _p = Promise_double_pending(); ts_schedule_file_size(_p.state, path); return _p; }')
    wrappers.push('static inline Promise_double ts_execAsync(Str cmd) { Promise_double _p = Promise_double_pending(); ts_schedule_exec(_p.state, cmd); return _p; }')
  }
  if (promiseTypes.has('Promise_StrArr')) {
    wrappers.push('static inline Promise_StrArr ts_listDirAsync(Str path) { Promise_StrArr _p = Promise_StrArr_pending(); ts_schedule_list_dir(_p.state, path); return _p; }')
  }
  if (promiseTypes.has('Promise_TSFetchResponse')) {
    wrappers.push('static inline Promise_TSFetchResponse ts_fetch(Str url, Str method, Str body, Str headers) { Promise_TSFetchResponse _p = Promise_TSFetchResponse_pending(); ts_schedule_fetch(_p.state, url, method, body, headers); return _p; }')
  }

  if (wrappers.length > 0) {
    for (const wrapper of wrappers) lines.push(wrapper)
    lines.push('')
  }
}
