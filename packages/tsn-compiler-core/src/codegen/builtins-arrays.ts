import * as ts from 'typescript'

import type { BuiltinEmitterContext } from './shared.js'

function emitArrayEq(innerType: string, elemExpr: string, valueExpr: string): string {
  if (innerType === 'string') return `str_eq(${elemExpr}, ${valueExpr})`
  return `${elemExpr} == ${valueExpr}`
}

function emitPredicateMethod(
  ctx: BuiltinEmitterContext,
  objExpr: string,
  innerType: string,
  elemCType: string,
  method: string,
  fn: ts.Expression,
): string | null {
  const callback = ctx.emitPredicateCallback(fn, innerType)
  if (!callback) return null
  const id = ctx.nextTempId()
  const { paramName, body } = callback

  if (method === 'some') {
    return `({ bool _some${id} = false; for (int _i${id} = 0; _i${id} < ${objExpr}.len; _i${id}++) { ` +
      `${elemCType} ${paramName} = ${objExpr}.data[_i${id}]; ` +
      `if (${body}) { _some${id} = true; break; } } _some${id}; })`
  }

  if (method === 'every') {
    return `({ bool _every${id} = true; for (int _i${id} = 0; _i${id} < ${objExpr}.len; _i${id}++) { ` +
      `${elemCType} ${paramName} = ${objExpr}.data[_i${id}]; ` +
      `if (!(${body})) { _every${id} = false; break; } } _every${id}; })`
  }

  if (method === 'findIndex') {
    return `({ int _find${id} = -1; for (int _i${id} = 0; _i${id} < ${objExpr}.len; _i${id}++) { ` +
      `${elemCType} ${paramName} = ${objExpr}.data[_i${id}]; ` +
      `if (${body}) { _find${id} = _i${id}; break; } } _find${id}; })`
  }

  if (method === 'count') {
    return `({ int _count${id} = 0; for (int _i${id} = 0; _i${id} < ${objExpr}.len; _i${id}++) { ` +
      `${elemCType} ${paramName} = ${objExpr}.data[_i${id}]; ` +
      `if (${body}) _count${id}++; } _count${id}; })`
  }

  return null
}

function emitNumberArrayReduction(objExpr: string, method: string, id: number): string | null {
  if (method === 'sum') {
    return `({ double _sum${id} = 0; for (int _i${id} = 0; _i${id} < ${objExpr}.len; _i${id}++) _sum${id} += ${objExpr}.data[_i${id}]; _sum${id}; })`
  }
  if (method === 'min') {
    return `({ double _min${id} = ${objExpr}.len > 0 ? ${objExpr}.data[0] : 0; for (int _i${id} = 1; _i${id} < ${objExpr}.len; _i${id}++) if (${objExpr}.data[_i${id}] < _min${id}) _min${id} = ${objExpr}.data[_i${id}]; _min${id}; })`
  }
  if (method === 'max') {
    return `({ double _max${id} = ${objExpr}.len > 0 ? ${objExpr}.data[0] : 0; for (int _i${id} = 1; _i${id} < ${objExpr}.len; _i${id}++) if (${objExpr}.data[_i${id}] > _max${id}) _max${id} = ${objExpr}.data[_i${id}]; _max${id}; })`
  }
  return null
}

export function emitArrayMethod(
  ctx: BuiltinEmitterContext,
  objExpr: string,
  objType: string,
  method: string,
  args: ts.NodeArray<ts.Expression>,
): string | null {
  const innerType = objType.replace('[]', '')
  const elemCType = ctx.arrayCElemType(objType)
  const arrTypeName = ctx.arrayTypeName(innerType)

  if (innerType === 'number' && (method === 'sum' || method === 'min' || method === 'max')) {
    return emitNumberArrayReduction(objExpr, method, ctx.nextTempId())
  }

  if (method === 'slice') {
    const a = args.map(n => ctx.emitExpr(n))
    return a.length === 1
      ? `${arrTypeName}_slice(&${objExpr}, (int)(${a[0]}), ${objExpr}.len)`
      : `${arrTypeName}_slice(&${objExpr}, (int)(${a[0]}), (int)(${a[1]}))`
  }

  if (method === 'indexOf') {
    const id = ctx.nextTempId()
    const needle = ctx.emitExpr(args[0])
    const elem = `_v${id}`
    return `({ int _idx${id} = -1; for (int _i${id} = 0; _i${id} < ${objExpr}.len; _i${id}++) { ` +
      `${elemCType} ${elem} = ${objExpr}.data[_i${id}]; ` +
      `if (${emitArrayEq(innerType, elem, needle)}) { _idx${id} = _i${id}; break; } } _idx${id}; })`
  }

  if (method === 'includes') {
    const id = ctx.nextTempId()
    const needle = ctx.emitExpr(args[0])
    const elem = `_v${id}`
    return `({ bool _found${id} = false; for (int _i${id} = 0; _i${id} < ${objExpr}.len; _i${id}++) { ` +
      `${elemCType} ${elem} = ${objExpr}.data[_i${id}]; ` +
      `if (${emitArrayEq(innerType, elem, needle)}) { _found${id} = true; break; } } _found${id}; })`
  }

  if (method === 'join') {
    if (innerType !== 'string' && innerType !== 'number' && innerType !== 'boolean') return null
    const id = ctx.nextTempId()
    const sep = args.length > 0 ? ctx.emitExpr(args[0]) : 'str_lit(",")'
    // Hoist objExpr to a temp to avoid re-evaluating slice/call expressions in the loop
    const isSimple = /^[a-zA-Z_]\w*$/.test(objExpr)
    const arrRef = isSimple ? objExpr : `_jarr${id}`
    const hoistDecl = isSimple ? '' : `${arrTypeName} ${arrRef} = ${objExpr}; `
    const hoistRelease = isSimple ? '' : ` ${arrTypeName}_release(&${arrRef});`
    let append = `strbuf_add_str(&_join${id}, ${arrRef}.data[_i${id}])`
    if (innerType === 'number') append = `strbuf_add_double(&_join${id}, ${arrRef}.data[_i${id}])`
    if (innerType === 'boolean') append = `strbuf_add_cstr(&_join${id}, ${arrRef}.data[_i${id}] ? "true" : "false")`
    return `({ ${hoistDecl}STRBUF(_join${id}, 256); for (int _i${id} = 0; _i${id} < ${arrRef}.len; _i${id}++) { ` +
      `if (_i${id} > 0) strbuf_add_str(&_join${id}, ${sep}); ${append}; } ` +
      `Str _rjoin${id} = strbuf_to_heap_str(&_join${id}); strbuf_free(&_join${id});${hoistRelease} _rjoin${id}; })`
  }

  if (method === 'reverse') {
    return `${arrTypeName}_reverse(&${objExpr})`
  }

  if (method === 'pop') {
    return `${arrTypeName}_pop(&${objExpr})`
  }

  if ((method === 'some' || method === 'every' || method === 'findIndex' || method === 'count') && args.length > 0) {
    return emitPredicateMethod(ctx, objExpr, innerType, elemCType, method, args[0])
  }

  return null
}
