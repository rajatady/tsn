import * as ts from 'typescript'
import type { StdlibEmitterContext } from './shared.js'

function emitArrayEq(innerType: string, elemExpr: string, valueExpr: string): string {
  if (innerType === 'string') return `str_eq(${elemExpr}, ${valueExpr})`
  return `${elemExpr} == ${valueExpr}`
}

export function emitArrayMethod(
  ctx: StdlibEmitterContext,
  objExpr: string,
  objType: string,
  method: string,
  args: ts.NodeArray<ts.Expression>
): string | null {
  const innerType = objType.replace('[]', '')
  const elemCType = ctx.arrayCElemType(objType)
  const arrTypeName = ctx.arrayTypeName(innerType)

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
    let append = `strbuf_add_str(&_join${id}, ${objExpr}.data[_i${id}])`
    if (innerType === 'number') append = `strbuf_add_double(&_join${id}, ${objExpr}.data[_i${id}])`
    if (innerType === 'boolean') append = `strbuf_add_cstr(&_join${id}, ${objExpr}.data[_i${id}] ? "true" : "false")`
    return `({ STRBUF(_join${id}, 256); for (int _i${id} = 0; _i${id} < ${objExpr}.len; _i${id}++) { ` +
      `if (_i${id} > 0) strbuf_add_str(&_join${id}, ${sep}); ${append}; } ` +
      `Str _rjoin${id} = strbuf_to_heap_str(&_join${id}); strbuf_free(&_join${id}); _rjoin${id}; })`
  }

  return null
}

