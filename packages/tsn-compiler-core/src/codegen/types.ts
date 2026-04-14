import * as ts from 'typescript'

import {
  promiseInnerType,
  registerPromiseType,
} from './async-types.js'

export interface StructField {
  name: string
  tsType: string
  cType: string
}

export interface StructDef {
  name: string
  fields: StructField[]
}

export interface ClassMethod {
  name: string
  params: Array<{ name: string; tsType: string; cType: string }>
  returnTsType: string
  returnCType: string
  bodyNode: ts.Block | null
  isPrivate: boolean
}

export interface ClassDef {
  name: string
  baseName: string
  fields: StructField[]
  methods: ClassMethod[]
  hasConstructor: boolean
  ctorParams: Array<{ name: string; tsType: string; cType: string }>
  ctorBody: ts.Block | null
  genericArgs: Map<string, string>
}

export interface ParamAlias {
  name: string
  tsType: string
  cType: string
  accessExpr: string
}

export interface ParamInfo {
  name: string
  tsType: string
  cType: string
  aliases: ParamAlias[]
  hasDefault: boolean
}

export interface TypeResolutionContext {
  arrayTypes: Set<string>
  promiseTypes: Map<string, string>
  hasClassType(name: string): boolean
}

export function isNullishTypeName(tsType: string): boolean {
  return tsType === 'null' || tsType === 'undefined'
}

export function nullableBaseType(tsType: string): string | null {
  return tsType.endsWith('?') ? tsType.slice(0, -1) : null
}

export function makeNullableType(tsType: string): string {
  return nullableBaseType(tsType) ? tsType : `${tsType}?`
}

export function isNullableCapableTypeName(tsType: string, ctx?: Pick<TypeResolutionContext, 'hasClassType'>): boolean {
  const base = nullableBaseType(tsType) ?? tsType
  if (base === 'string') return true
  if (base === 'number') return true
  if (base === 'boolean') return true
  if (base.endsWith('[]')) return true
  if (ctx?.hasClassType(base)) return true
  return false
}

/** Returns true only for nullable primitive types: number? or boolean? */
export function isNullablePrimitive(tsType: string): boolean {
  const base = nullableBaseType(tsType)
  if (!base) return false
  return base === 'number' || base === 'boolean'
}

export function tsTypeName(typeNode: ts.TypeNode | undefined): string {
  if (!typeNode) return 'number'
  if (ts.isUnionTypeNode(typeNode)) {
    const memberNames = typeNode.types.map(member => tsTypeName(member))
    const nonNullish = memberNames.filter(name => !isNullishTypeName(name))
    const hasNullish = nonNullish.length !== memberNames.length
    if (hasNullish && nonNullish.length === 1) {
      return makeNullableType(nonNullish[0])
    }
    return memberNames.join(' | ')
  }
  if (ts.isTypeReferenceNode(typeNode)) {
    const name = typeNode.typeName.getText()
    if (name === 'Array' && typeNode.typeArguments?.length) {
      return tsTypeName(typeNode.typeArguments[0]) + '[]'
    }
    if (name === 'Promise' && typeNode.typeArguments?.length) {
      return `Promise<${tsTypeName(typeNode.typeArguments[0])}>`
    }
    return name
  }
  if (ts.isArrayTypeNode(typeNode)) {
    return tsTypeName(typeNode.elementType) + '[]'
  }
  return typeNode.getText()
}

function cTypeLabel(tsType: string): string {
  switch (tsType) {
    case 'string': return 'Str'
    case 'number': return 'Double'
    case 'boolean': return 'Bool'
    default: return tsType
  }
}

function hashFnForKey(tsType: string): string {
  switch (tsType) {
    case 'string': return 'tsn_hash_str'
    case 'number': return 'tsn_hash_double'
    case 'boolean': return 'tsn_hash_bool'
    default: return 'tsn_hash_str'
  }
}

function eqFnForKey(tsType: string): string {
  switch (tsType) {
    case 'string': return 'tsn_eq_str'
    case 'number': return 'tsn_eq_double'
    case 'boolean': return 'tsn_eq_bool'
    default: return 'tsn_eq_str'
  }
}

function keyCType(tsType: string): string {
  switch (tsType) {
    case 'string': return 'Str'
    case 'number': return 'double'
    case 'boolean': return 'bool'
    default: return tsType
  }
}

function valCType(tsType: string): string {
  return keyCType(tsType)
}

export interface MapTypeInfo {
  name: string
  keyCType: string
  valCType: string
  hashFn: string
  eqFn: string
  keyTsType: string
  valTsType: string
}

export function mapTypeName(keyTsType: string, valTsType: string): string {
  return `${cTypeLabel(keyTsType)}${cTypeLabel(valTsType)}Map`
}

export function mapTypeInfo(keyTsType: string, valTsType: string): MapTypeInfo {
  return {
    name: mapTypeName(keyTsType, valTsType),
    keyCType: keyCType(keyTsType),
    valCType: valCType(valTsType),
    hashFn: hashFnForKey(keyTsType),
    eqFn: eqFnForKey(keyTsType),
    keyTsType,
    valTsType,
  }
}

export function setTypeName(elemTsType: string): string {
  return `${cTypeLabel(elemTsType)}Set`
}

export interface SetTypeInfo {
  name: string
  elemCType: string
  hashFn: string
  eqFn: string
  elemTsType: string
}

export function setTypeInfo(elemTsType: string): SetTypeInfo {
  return {
    name: setTypeName(elemTsType),
    elemCType: keyCType(elemTsType),
    hashFn: hashFnForKey(elemTsType),
    eqFn: eqFnForKey(elemTsType),
    elemTsType,
  }
}

export function arrayTypeName(innerTsType: string, arrayTypes: Set<string>): string {
  switch (innerTsType) {
    case 'string':
      arrayTypes.add('Str')
      return 'StrArr'
    case 'number':
      arrayTypes.add('double')
      return 'DoubleArr'
    case 'boolean':
      arrayTypes.add('bool')
      return 'BoolArr'
    case 'JSX.Element':
      arrayTypes.add('UIHandle')
      return 'UIHandleArr'
    default:
      arrayTypes.add(innerTsType)
      return `${innerTsType}Arr`
  }
}

export function arrayCElemType(tsType: string): string {
  const inner = tsType.replace('[]', '')
  switch (inner) {
    case 'string':
      return 'Str'
    case 'number':
      return 'double'
    case 'boolean':
      return 'bool'
    case 'JSX.Element':
      return 'UIHandle'
    default:
      return inner
  }
}

export function tsTypeNameToC(tsType: string, ctx: TypeResolutionContext, fallback = 'double'): string {
  const nullableBase = nullableBaseType(tsType)
  if (nullableBase) {
    if (nullableBase === 'number') return 'NullableDouble'
    if (nullableBase === 'boolean') return 'NullableBool'
    return tsTypeNameToC(nullableBase, ctx, fallback)
  }
  const promisedInner = promiseInnerType(tsType)
  if (promisedInner) {
    const valueCType = tsTypeNameToC(promisedInner, ctx)
    return registerPromiseType(ctx, valueCType)
  }
  if (tsType.startsWith('Map<')) {
    const inner = tsType.slice(4, -1)
    const [k, v] = inner.split(',').map(s => s.trim())
    return mapTypeName(k, v)
  }
  if (tsType.startsWith('Set<')) {
    return setTypeName(tsType.slice(4, -1).trim())
  }
  if (tsType.endsWith('[]')) {
    const inner = tsType.slice(0, -2)
    return arrayTypeName(inner, ctx.arrayTypes)
  }
  switch (tsType) {
    case 'number':
      return 'double'
    case 'string':
      return 'Str'
    case 'boolean':
      return 'bool'
    case 'void':
      return 'void'
    case 'Response':
      return 'TSFetchResponse'
    case 'JSX.Element':
      return 'UIHandle'
    default:
      if (ctx.hasClassType(tsType)) return `${tsType} *`
      return tsType || fallback
  }
}

export function tsTypeToC(typeNode: ts.TypeNode | undefined, ctx: TypeResolutionContext, fallback = 'double'): string {
  if (!typeNode) return fallback
  return tsTypeNameToC(tsTypeName(typeNode), ctx, fallback)
}

export function zeroValueForTsType(tsType: string, ctx: TypeResolutionContext): string {
  const nullable = nullableBaseType(tsType)
  if (nullable === 'number') return '(NullableDouble){0, false}'
  if (nullable === 'boolean') return '(NullableBool){false, false}'
  const base = nullable ?? tsType
  if (base === 'number') return '0'
  if (base === 'boolean') return 'false'
  if (base === 'string') return '(Str){0}'
  if (base.endsWith('[]')) return `(${tsTypeNameToC(base, ctx)}){0}`
  if (ctx.hasClassType(base)) return 'NULL'
  return `(${tsTypeNameToC(base, ctx)}){0}`
}
