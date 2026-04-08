import * as ts from 'typescript'

import { emitArrayMethod } from './builtins-arrays.js'
import { emitStringMethod } from './builtins-strings.js'
import type { ClassDef, StructDef } from './types.js'

export interface ExprEmitterContext {
  hooks: {
    emitSetterCall(name: string, args: ts.NodeArray<ts.Expression>): string | null
  }
  builderVars: Set<string>
  identifierAliases: Map<string, string>
  classDefs: Map<string, ClassDef>
  currentClass: string | null
  sourceFile: ts.SourceFile | null
  sourceFileName: string
  emitExpr(node: ts.Node): string
  exprType(node: ts.Node): string | undefined
  arrayCElemType(tsType: string): string
  arrayTypeName(innerTsType: string): string
  emitPredicateCallback(fnExpr: ts.Expression, paramType: string): { paramName: string; body: string } | null
  tsTypeNameToC(tsType: string, fallback?: string): string
  nextTempId(): number
  varTypes: Map<string, string>
  arrayTypes: Set<string>
  structs: StructDef[]
  lambdas: string[]
}

export function emitPropAccess(ctx: ExprEmitterContext, node: ts.PropertyAccessExpression): string {
  const prop = node.name.text
  if (ts.isIdentifier(node.expression)) {
    if (node.expression.text === 'console') return `console_${prop}`
    if (node.expression.text === 'Math') return `ts_math_${prop}`
    if (node.expression.text === 'JSON') return `json_${prop}`
  }

  if (prop === 'length' && ts.isIdentifier(node.expression) && ctx.builderVars.has(node.expression.text)) {
    return `_b_${node.expression.text}.len`
  }

  const objType = ctx.exprType(node.expression)
  if (objType && ctx.classDefs.has(objType)) {
    if (node.expression.kind === ts.SyntaxKind.ThisKeyword) {
      return `self->${prop}`
    }
    const obj = ctx.emitExpr(node.expression)
    if (prop === 'length') return `${obj}->len`
    return `${obj}->${prop}`
  }

  const obj = ctx.emitExpr(node.expression)
  if (prop === 'length') return `${obj}.len`
  return `${obj}.${prop}`
}

export function emitCall(ctx: ExprEmitterContext, node: ts.CallExpression): string {
  if (ts.isIdentifier(node.expression)) {
    const hookCall = ctx.hooks.emitSetterCall(node.expression.text, node.arguments)
    if (hookCall) return hookCall
  }

  if (ts.isPropertyAccessExpression(node.expression)) {
    const obj = node.expression.expression
    const method = node.expression.name.text
    const objExpr = ctx.emitExpr(obj)
    const objType = ctx.exprType(obj)

    if (ts.isIdentifier(obj) && obj.text === 'console' && method === 'log') {
      return emitConsoleLog(ctx, node.arguments)
    }

    if (ts.isIdentifier(obj) && obj.text === 'Math') {
      const args = node.arguments.map(a => ctx.emitExpr(a)).join(', ')
      return `ts_math_${method}(${args})`
    }

    if (ts.isIdentifier(obj) && obj.text === 'Cpu') {
      if (method === 'inb') return `((double)ts_cpu_inb((uint16_t)(${ctx.emitExpr(node.arguments[0])})))`
      if (method === 'outb') return `ts_cpu_outb((uint16_t)(${ctx.emitExpr(node.arguments[0])}), (uint8_t)(${ctx.emitExpr(node.arguments[1])}))`
      if (method === 'halt') return `({ __asm__ volatile ("hlt"); 0; })`
      if (method === 'cli') return `({ __asm__ volatile ("cli"); 0; })`
      if (method === 'sti') return `({ __asm__ volatile ("sti"); 0; })`
      if (method === 'nop') return `({ __asm__ volatile ("nop"); 0; })`
    }

    if (ts.isIdentifier(obj) && obj.text === 'Mem') {
      if (method === 'writeU16') return `ts_mem_write_u16((uint32_t)(${ctx.emitExpr(node.arguments[0])}), (uint16_t)(${ctx.emitExpr(node.arguments[1])}))`
      if (method === 'readU16') return `((double)ts_mem_read_u16((uint32_t)(${ctx.emitExpr(node.arguments[0])})))`
      if (method === 'writeU8') return `ts_mem_write_u8((uint32_t)(${ctx.emitExpr(node.arguments[0])}), (uint8_t)(${ctx.emitExpr(node.arguments[1])}))`
      if (method === 'readU8') return `((double)ts_mem_read_u8((uint32_t)(${ctx.emitExpr(node.arguments[0])})))`
      if (method === 'writeU32') return `ts_mem_write_u32((uint32_t)(${ctx.emitExpr(node.arguments[0])}), (uint32_t)(${ctx.emitExpr(node.arguments[1])}))`
      if (method === 'readU32') return `((double)ts_mem_read_u32((uint32_t)(${ctx.emitExpr(node.arguments[0])})))`
    }

    if (ts.isIdentifier(obj) && obj.text === 'JSON' && method === 'parse') {
      return `json_parse_data(${ctx.emitExpr(node.arguments[0])})`
    }

    if (objType && ctx.classDefs.has(objType)) {
      const args = node.arguments.map(a => ctx.emitExpr(a)).join(', ')
      if (obj.kind === ts.SyntaxKind.ThisKeyword) {
        return args ? `${objType}_${method}(self, ${args})` : `${objType}_${method}(self)`
      }
      return args ? `${objType}_${method}(${objExpr}, ${args})` : `${objType}_${method}(${objExpr})`
    }

    if (objType === 'string') {
      const emitted = emitStringMethod(ctx, objExpr, method, node.arguments)
      if (emitted) return emitted
    }

    if (objType?.endsWith('[]')) {
      const innerType = objType.replace('[]', '')
      const arrTypeName = ctx.arrayTypeName(innerType)

      if (method === 'push') {
        const arg = node.arguments[0]
        if (ts.isIdentifier(arg) && ctx.builderVars.has(arg.text)) {
          return `${arrTypeName}_push(&${objExpr}, strbuf_to_heap_str(&_b_${arg.text}))`
        }
        let val = ctx.emitExpr(arg)
        if (innerType === 'string') val = `str_retain(${val})`
        return `${arrTypeName}_push(&${objExpr}, ${val})`
      }

      const emitted = emitArrayMethod(ctx, objExpr, objType, method, node.arguments)
      if (emitted) return emitted
      if (method === 'filter') return emitFilter(ctx, node, objExpr, objType)
      if (method === 'sort') return emitSort(ctx, node, objExpr, objType)
      if (method === 'map') return emitMap(ctx, node, objExpr, objType)
      if (method === 'reduce') return emitReduce(ctx, node, objExpr, objType)
      if (method === 'forEach') return emitForEach(ctx, node, objExpr, objType)
    }
  }

  if (ts.isIdentifier(node.expression) && node.expression.text === 'String') {
    return `num_to_str(${ctx.emitExpr(node.arguments[0])})`
  }

  if (
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === 'String' &&
    node.expression.name.text === 'fromCharCode'
  ) {
    return `str_from_charcode((int)(${ctx.emitExpr(node.arguments[0])}))`
  }

  if (ts.isIdentifier(node.expression) && node.expression.text === 'parseFloat') {
    return `ts_parse_float(${ctx.emitExpr(node.arguments[0])})`
  }

  if (ts.isIdentifier(node.expression) && node.expression.text === 'parseInt') {
    return `ts_parse_int(${ctx.emitExpr(node.arguments[0])})`
  }

  if (ts.isIdentifier(node.expression) && node.expression.text === 'readFile') {
    return `ts_readFile(${ctx.emitExpr(node.arguments[0])})`
  }

  if (ts.isIdentifier(node.expression) && node.expression.text === 'writeFile') {
    return `ts_writeFile(${ctx.emitExpr(node.arguments[0])}, ${ctx.emitExpr(node.arguments[1])})`
  }

  if (ts.isIdentifier(node.expression) && node.expression.text === 'appendFile') {
    return `ts_appendFile(${ctx.emitExpr(node.arguments[0])}, ${ctx.emitExpr(node.arguments[1])})`
  }

  if (ts.isIdentifier(node.expression) && node.expression.text === 'fileExists') {
    return `ts_fileExists(${ctx.emitExpr(node.arguments[0])})`
  }

  if (ts.isIdentifier(node.expression) && node.expression.text === 'fileSize') {
    return `ts_fileSize(${ctx.emitExpr(node.arguments[0])})`
  }

  if (ts.isIdentifier(node.expression) && node.expression.text === 'listDir') {
    return `ts_listDir(${ctx.emitExpr(node.arguments[0])})`
  }

  if (ts.isIdentifier(node.expression) && node.expression.text === 'exec') {
    return `ts_exec(${ctx.emitExpr(node.arguments[0])})`
  }

  const name = ctx.emitExpr(node.expression)
  const args = node.arguments.map(a => {
    if (ts.isIdentifier(a) && ctx.builderVars.has(a.text)) {
      return `strbuf_to_heap_str(&_b_${a.text})`
    }
    return ctx.emitExpr(a)
  }).join(', ')
  return `${name}(${args})`
}

export function emitConsoleLog(ctx: ExprEmitterContext, args: ts.NodeArray<ts.Expression>): string {
  const parts: string[] = []
  for (const arg of args) {
    emitPrintExpr(ctx, arg, parts)
  }
  parts.push('print_nl()')
  return `({ ${parts.join('; ')}; })`
}

export function emitPrintExpr(ctx: ExprEmitterContext, node: ts.Expression, parts: string[]): void {
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const lt = ctx.exprType(node.left)
    const rt = ctx.exprType(node.right)
    if (lt === 'string' || rt === 'string') {
      emitPrintExpr(ctx, node.left as ts.Expression, parts)
      emitPrintExpr(ctx, node.right as ts.Expression, parts)
      return
    }
  }

  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'String') {
    parts.push(`print_num(${ctx.emitExpr(node.arguments[0])})`)
    return
  }

  const t = ctx.exprType(node)
  const e = ctx.emitExpr(node)
  if (t === 'string') parts.push(`print_str(${e})`)
  else if (t === 'number') parts.push(`print_num(${e})`)
  else if (t === 'boolean') parts.push(`print_bool(${e})`)
  else parts.push(`print_str(${e})`)
}

export function emitBinary(ctx: ExprEmitterContext, node: ts.BinaryExpression): string {
  const op = node.operatorToken.kind
  const lt = ctx.exprType(node.left)
  const rt = ctx.exprType(node.right)
  const left = ctx.emitExpr(node.left)
  const right = ctx.emitExpr(node.right)

  if (op === ts.SyntaxKind.PlusToken && (lt === 'string' || rt === 'string')) {
    const pieces: Array<{ expr: string; type: string }> = []
    flattenConcat(ctx, node, pieces)
    const bufId = ctx.nextTempId()
    const bufName = `_cat${bufId}`
    const adds = pieces.map(p => {
      if (p.type === 'number') return `strbuf_add_double(&${bufName}, ${p.expr})`
      return `strbuf_add_str(&${bufName}, ${p.expr})`
    }).join('; ')
    return `({ STRBUF(${bufName}, 256); ${adds}; Str _r${bufName} = strbuf_to_heap_str(&${bufName}); strbuf_free(&${bufName}); _r${bufName}; })`
  }

  if ((op === ts.SyntaxKind.EqualsEqualsEqualsToken || op === ts.SyntaxKind.EqualsEqualsToken) && lt === 'string' && rt === 'string') {
    const charCmp = tryCharCompare(ctx, node.left, node.right, false)
    if (charCmp) return charCmp
    return `str_eq(${left}, ${right})`
  }
  if ((op === ts.SyntaxKind.ExclamationEqualsEqualsToken || op === ts.SyntaxKind.ExclamationEqualsToken) && lt === 'string' && rt === 'string') {
    const charCmp = tryCharCompare(ctx, node.left, node.right, true)
    if (charCmp) return charCmp
    return `!str_eq(${left}, ${right})`
  }

  if (op === ts.SyntaxKind.EqualsToken) {
    if (ts.isElementAccessExpression(node.left)) {
      const arr = ctx.emitExpr(node.left.expression)
      const arrName = node.left.expression.getText()
      const idx = ctx.emitExpr(node.left.argumentExpression)
      const sl = ctx.sourceFile ? ctx.sourceFile.getLineAndCharacterOfPosition(node.left.getStart()) : null
      const file = ctx.sourceFileName || 'unknown'
      const line = sl ? sl.line + 1 : 0
      return `ARRAY_SET(${arr}, ${idx}, ${right}, "${arrName}", "${file}", ${line})`
    }
    return `${left} = ${right}`
  }

  if (op === ts.SyntaxKind.EqualsEqualsEqualsToken || op === ts.SyntaxKind.EqualsEqualsToken) {
    return `(${left} == ${right})`
  }
  if (op === ts.SyntaxKind.ExclamationEqualsEqualsToken || op === ts.SyntaxKind.ExclamationEqualsToken) {
    return `(${left} != ${right})`
  }

  if ((op === ts.SyntaxKind.PlusEqualsToken || op === ts.SyntaxKind.MinusEqualsToken) &&
      ts.isElementAccessExpression(node.left)) {
    const arr = ctx.emitExpr(node.left.expression)
    const arrName = node.left.expression.getText()
    const idx = ctx.emitExpr(node.left.argumentExpression)
    const sl = ctx.sourceFile ? ctx.sourceFile.getLineAndCharacterOfPosition(node.left.getStart()) : null
    const file = ctx.sourceFileName || 'unknown'
    const line = sl ? sl.line + 1 : 0
    const cOp = op === ts.SyntaxKind.PlusEqualsToken ? '+' : '-'
    return `ARRAY_SET(${arr}, ${idx}, ARRAY_GET(${arr}, ${idx}, "${arrName}", "${file}", ${line}) ${cOp} ${right}, "${arrName}", "${file}", ${line})`
  }

  if (op === ts.SyntaxKind.PercentToken) {
    return `fmod(${left}, ${right})`
  }

  if (op === ts.SyntaxKind.AmpersandToken || op === ts.SyntaxKind.BarToken ||
      op === ts.SyntaxKind.CaretToken || op === ts.SyntaxKind.LessThanLessThanToken ||
      op === ts.SyntaxKind.GreaterThanGreaterThanToken) {
    const opMap2: Record<number, string> = {
      [ts.SyntaxKind.AmpersandToken]: '&',
      [ts.SyntaxKind.BarToken]: '|',
      [ts.SyntaxKind.CaretToken]: '^',
      [ts.SyntaxKind.LessThanLessThanToken]: '<<',
      [ts.SyntaxKind.GreaterThanGreaterThanToken]: '>>',
    }
    return `((double)((int)(${left}) ${opMap2[op]} (int)(${right})))`
  }

  const opMap: Record<number, string> = {
    [ts.SyntaxKind.PlusToken]: '+',
    [ts.SyntaxKind.MinusToken]: '-',
    [ts.SyntaxKind.AsteriskToken]: '*',
    [ts.SyntaxKind.SlashToken]: '/',
    [ts.SyntaxKind.LessThanToken]: '<',
    [ts.SyntaxKind.LessThanEqualsToken]: '<=',
    [ts.SyntaxKind.GreaterThanToken]: '>',
    [ts.SyntaxKind.GreaterThanEqualsToken]: '>=',
    [ts.SyntaxKind.AmpersandAmpersandToken]: '&&',
    [ts.SyntaxKind.BarBarToken]: '||',
    [ts.SyntaxKind.PlusEqualsToken]: '+=',
    [ts.SyntaxKind.MinusEqualsToken]: '-=',
  }
  return `(${left} ${opMap[op] || '?'} ${right})`
}

export function flattenConcat(ctx: ExprEmitterContext, node: ts.Node, out: Array<{ expr: string; type: string }>): void {
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const lt = ctx.exprType(node.left)
    const rt = ctx.exprType(node.right)
    if (lt === 'string' || rt === 'string') {
      flattenConcat(ctx, node.left, out)
      flattenConcat(ctx, node.right, out)
      return
    }
  }
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'String') {
    out.push({ expr: ctx.emitExpr(node.arguments[0]), type: 'number' })
    return
  }
  out.push({ expr: ctx.emitExpr(node), type: ctx.exprType(node) || 'string' })
}

export function extractCharSlice(ctx: ExprEmitterContext, node: ts.Node): { str: string; idx: string } | null {
  if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return null
  if (node.expression.name.text !== 'slice' || node.arguments.length !== 2) return null
  const start = node.arguments[0]
  const end = node.arguments[1]
  if (
    ts.isBinaryExpression(end) &&
    end.operatorToken.kind === ts.SyntaxKind.PlusToken &&
    ts.isNumericLiteral(end.right) &&
    end.right.text === '1' &&
    start.getText() === end.left.getText()
  ) {
    return { str: ctx.emitExpr(node.expression.expression), idx: ctx.emitExpr(start) }
  }
  return null
}

export function extractCharLit(node: ts.Node): string | null {
  if (ts.isStringLiteral(node) && node.text.length === 1) {
    const c = node.text
    if (c === '\\') return '\\\\'
    if (c === '\'') return '\\\''
    if (c === '\n') return '\\n'
    if (c === '\t') return '\\t'
    return c
  }
  return null
}

export function tryCharCompare(ctx: ExprEmitterContext, left: ts.Node, right: ts.Node, negate: boolean): string | null {
  const slice = extractCharSlice(ctx, left) || extractCharSlice(ctx, right)
  const lit = extractCharLit(left) || extractCharLit(right)
  if (slice && lit) {
    const pre = negate ? '!' : ''
    return `${pre}(str_at(${slice.str}, (int)(${slice.idx})) == '${lit}')`
  }
  return null
}

export function emitFilter(ctx: ExprEmitterContext, call: ts.CallExpression, objExpr: string, arrType: string): string {
  const fn = call.arguments[0]
  const innerType = arrType.replace('[]', '')
  const elemCType = ctx.arrayCElemType(arrType)
  const arrTypeName = ctx.arrayTypeName(innerType)
  const callback = ctx.emitPredicateCallback(fn, innerType)
  if (!callback) return `/* unsupported filter */${objExpr}`
  const { paramName, body: cond } = callback
  const id = ctx.nextTempId()
  return `({ ${arrTypeName} _src${id} = ${objExpr}; ${arrTypeName} _r${id} = ${arrTypeName}_new(); ` +
    `for (int _i${id} = 0; _i${id} < _src${id}.len; _i${id}++) { ` +
    `${elemCType} ${paramName} = _src${id}.data[_i${id}]; ` +
    `if (${cond}) ${arrTypeName}_push(&_r${id}, ${paramName}); } ` +
    `_r${id}; })`
}

export function emitMap(ctx: ExprEmitterContext, call: ts.CallExpression, objExpr: string, arrType: string): string {
  const fn = call.arguments[0]
  if (!fn || !ts.isArrowFunction(fn) || fn.parameters.length === 0) {
    return `/* unsupported map */${objExpr}`
  }

  const innerType = arrType.replace('[]', '')
  const elemCType = ctx.arrayCElemType(arrType)
  const arrTypeName = ctx.arrayTypeName(innerType)
  const paramName = fn.parameters[0].name.getText()

  const prev = ctx.varTypes.get(paramName)
  ctx.varTypes.set(paramName, innerType)

  const bodyExpr = ts.isBlock(fn.body)
    ? (() => {
        const ret = fn.body.statements.find(s => ts.isReturnStatement(s)) as ts.ReturnStatement | undefined
        return ret?.expression ? ctx.emitExpr(ret.expression) : '0'
      })()
    : ctx.emitExpr(fn.body)

  const outTsType = ts.isBlock(fn.body)
    ? (() => {
        const ret = fn.body.statements.find(s => ts.isReturnStatement(s)) as ts.ReturnStatement | undefined
        return ret?.expression ? (ctx.exprType(ret.expression) ?? 'number') : 'number'
      })()
    : (ctx.exprType(fn.body) ?? 'number')

  if (prev) ctx.varTypes.set(paramName, prev)
  else ctx.varTypes.delete(paramName)

  const outCType = ctx.tsTypeNameToC(outTsType)
  const outArrType = ctx.arrayTypeName(outTsType)
  ctx.arrayTypes.add(outCType)

  const id = ctx.nextTempId()
  let pushVal = bodyExpr
  if (outTsType === 'string') pushVal = `str_retain(${bodyExpr})`

  return `({ ${arrTypeName} _src${id} = ${objExpr}; ${outArrType} _r${id} = ${outArrType}_new(); ` +
    `for (int _i${id} = 0; _i${id} < _src${id}.len; _i${id}++) { ` +
    `${elemCType} ${paramName} = _src${id}.data[_i${id}]; ` +
    `${outArrType}_push(&_r${id}, ${pushVal}); } ` +
    `_r${id}; })`
}

export function emitReduce(ctx: ExprEmitterContext, call: ts.CallExpression, objExpr: string, arrType: string): string {
  const fn = call.arguments[0]
  if (!fn || !ts.isArrowFunction(fn) || fn.parameters.length < 2) {
    return `/* unsupported reduce */${objExpr}`
  }

  const innerType = arrType.replace('[]', '')
  const elemCType = ctx.arrayCElemType(arrType)
  const accName = fn.parameters[0].name.getText()
  const elemName = fn.parameters[1].name.getText()
  const initExpr = call.arguments.length >= 2 ? ctx.emitExpr(call.arguments[1]) : '0'
  const accTsType = call.arguments.length >= 2 ? (ctx.exprType(call.arguments[1]) ?? 'number') : 'number'
  const accCType = ctx.tsTypeNameToC(accTsType)

  const prevAcc = ctx.varTypes.get(accName)
  const prevElem = ctx.varTypes.get(elemName)
  ctx.varTypes.set(accName, accTsType)
  ctx.varTypes.set(elemName, innerType)

  const bodyExpr = ts.isBlock(fn.body)
    ? (() => {
        const ret = fn.body.statements.find(s => ts.isReturnStatement(s)) as ts.ReturnStatement | undefined
        return ret?.expression ? ctx.emitExpr(ret.expression) : accName
      })()
    : ctx.emitExpr(fn.body)

  if (prevAcc) ctx.varTypes.set(accName, prevAcc)
  else ctx.varTypes.delete(accName)
  if (prevElem) ctx.varTypes.set(elemName, prevElem)
  else ctx.varTypes.delete(elemName)

  const arrTypeName = ctx.arrayTypeName(innerType)
  const id = ctx.nextTempId()
  return `({ ${arrTypeName} _src${id} = ${objExpr}; ${accCType} ${accName} = ${initExpr}; ` +
    `for (int _i${id} = 0; _i${id} < _src${id}.len; _i${id}++) { ` +
    `${elemCType} ${elemName} = _src${id}.data[_i${id}]; ` +
    `${accName} = ${bodyExpr}; } ` +
    `${accName}; })`
}

export function emitForEach(ctx: ExprEmitterContext, call: ts.CallExpression, objExpr: string, arrType: string): string {
  const fn = call.arguments[0]
  if (!fn || !ts.isArrowFunction(fn) || fn.parameters.length === 0) {
    return '/* unsupported forEach */0'
  }

  const innerType = arrType.replace('[]', '')
  const elemCType = ctx.arrayCElemType(arrType)
  const paramName = fn.parameters[0].name.getText()

  const prev = ctx.varTypes.get(paramName)
  ctx.varTypes.set(paramName, innerType)

  const arrTypeName = ctx.arrayTypeName(innerType)

  if (ts.isBlock(fn.body)) {
    const bodyParts: string[] = []
    for (const s of fn.body.statements) {
      if (ts.isExpressionStatement(s)) {
        bodyParts.push(ctx.emitExpr(s.expression) + ';')
      }
    }
    if (prev) ctx.varTypes.set(paramName, prev)
    else ctx.varTypes.delete(paramName)
    const id = ctx.nextTempId()
    return `({ ${arrTypeName} _src${id} = ${objExpr}; for (int _i${id} = 0; _i${id} < _src${id}.len; _i${id}++) { ` +
      `${elemCType} ${paramName} = _src${id}.data[_i${id}]; ` +
      `${bodyParts.join(' ')} } 0; })`
  }

  const bodyExpr = ctx.emitExpr(fn.body)
  if (prev) ctx.varTypes.set(paramName, prev)
  else ctx.varTypes.delete(paramName)
  const id = ctx.nextTempId()
  return `({ ${arrTypeName} _src${id} = ${objExpr}; for (int _i${id} = 0; _i${id} < _src${id}.len; _i${id}++) { ` +
    `${elemCType} ${paramName} = _src${id}.data[_i${id}]; ` +
    `${bodyExpr}; } 0; })`
}

export function emitSort(ctx: ExprEmitterContext, call: ts.CallExpression, objExpr: string, arrType: string): string {
  const fn = call.arguments[0]
  if (!fn || !ts.isArrowFunction(fn)) return '/* unsupported sort */0'

  const paramA = fn.parameters[0].name.getText()
  const paramB = fn.parameters[1].name.getText()
  const innerType = arrType.replace('[]', '')
  const elemCType = ctx.arrayCElemType(arrType)

  const prevA = ctx.varTypes.get(paramA)
  const prevB = ctx.varTypes.get(paramB)
  ctx.varTypes.set(paramA, innerType)
  ctx.varTypes.set(paramB, innerType)

  let body: string
  if (ts.isBlock(fn.body)) {
    const ret = fn.body.statements.find(s => ts.isReturnStatement(s)) as ts.ReturnStatement | undefined
    body = ret?.expression ? ctx.emitExpr(ret.expression) : '0'
  } else {
    body = ctx.emitExpr(fn.body)
  }

  if (prevA) ctx.varTypes.set(paramA, prevA)
  else ctx.varTypes.delete(paramA)
  if (prevB) ctx.varTypes.set(paramB, prevB)
  else ctx.varTypes.delete(paramB)

  const cmpName = `_cmp_${ctx.nextTempId()}`
  ctx.lambdas.push(
    `static int ${cmpName}(const void *_a, const void *_b) {\n` +
    `    ${elemCType} ${paramA} = *(const ${elemCType}*)_a;\n` +
    `    ${elemCType} ${paramB} = *(const ${elemCType}*)_b;\n` +
    `    double _r = ${body};\n` +
    `    return _r < 0 ? -1 : _r > 0 ? 1 : 0;\n` +
    `}`,
  )

  return `({ qsort(${objExpr}.data, ${objExpr}.len, sizeof(${elemCType}), ${cmpName}); ${objExpr}; })`
}

export function emitObjLit(ctx: ExprEmitterContext, node: ts.ObjectLiteralExpression): string {
  const fields = node.properties
    .filter(ts.isPropertyAssignment)
    .map(p => {
      const name = p.name!.getText()
      let val = ctx.emitExpr(p.initializer)

      if (ts.isArrayLiteralExpression(p.initializer) && p.initializer.elements.length === 0) {
        for (const s of ctx.structs) {
          const f = s.fields.find(x => x.name === name)
          if (f && f.tsType.endsWith('[]')) {
            val = `${ctx.arrayTypeName(f.tsType.replace('[]', ''))}_new()`
            break
          }
        }
      }

      for (const s of ctx.structs) {
        const f = s.fields.find(x => x.name === name)
        if (f && f.tsType.endsWith('[]') && !ts.isArrayLiteralExpression(p.initializer) && !val.includes('_new()')) {
          const inner = f.tsType.replace('[]', '')
          val = `${ctx.arrayTypeName(inner)}_retain(${val})`
        }
        if (f && f.tsType === 'string' && ts.isIdentifier(p.initializer)) {
          val = `str_retain(${val})`
        }
      }

      return `.${name} = ${val}`
    })
  return `{${fields.join(', ')}}`
}

export function emitTemplate(ctx: ExprEmitterContext, node: ts.TemplateExpression): string {
  const id = ctx.nextTempId()
  const adds: string[] = []
  if (node.head.text) adds.push(`strbuf_add_cstr(&_t${id}, ${JSON.stringify(node.head.text)})`)
  for (const span of node.templateSpans) {
    const t = ctx.exprType(span.expression)
    const e = ctx.emitExpr(span.expression)
    if (t === 'string') adds.push(`strbuf_add_str(&_t${id}, ${e})`)
    else adds.push(`strbuf_add_double(&_t${id}, ${e})`)
    if (span.literal.text) adds.push(`strbuf_add_cstr(&_t${id}, ${JSON.stringify(span.literal.text)})`)
  }
  return `({ STRBUF(_t${id}, 256); ${adds.join('; ')}; strbuf_to_str(&_t${id}); })`
}
