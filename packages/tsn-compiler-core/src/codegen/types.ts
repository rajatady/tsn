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
}

export interface TypeResolutionContext {
  arrayTypes: Set<string>
  promiseTypes: Map<string, string>
  hasClassType(name: string): boolean
}

export function tsTypeName(typeNode: ts.TypeNode | undefined): string {
  if (!typeNode) return 'number'
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
  const promisedInner = promiseInnerType(tsType)
  if (promisedInner) {
    const valueCType = tsTypeNameToC(promisedInner, ctx)
    return registerPromiseType(ctx, valueCType)
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
