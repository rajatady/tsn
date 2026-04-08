import type { TSNTextBehavior } from './text.js'

export type TSNNodeKind =
  | 'window'
  | 'stack'
  | 'rail'
  | 'scroll'
  | 'box'
  | 'overlay'
  | 'text'
  | 'image'
  | 'button'
  | 'input'
  | 'sidebar'
  | 'card'
  | 'custom'

export type TSNAxis = 'horizontal' | 'vertical'
export type TSNLengthUnit = 'point' | 'percent'
export type TSNLayoutAlign = 'start' | 'center' | 'end' | 'stretch'
export type TSNLayoutJustify = 'start' | 'center' | 'end' | 'space-between'
export type TSNTextTransform = 'none' | 'uppercase' | 'lowercase'
export type TSNTextAlign = 'start' | 'center' | 'end'

export interface TSNNodeRef {
  id: string
  kind: TSNNodeKind
}

export interface TSNEventBinding {
  name: string
  handler: string
  tag?: number
}

export interface TSNMediaValue {
  src: string
  fit?: 'cover' | 'contain' | 'fill'
  focalX?: number
  focalY?: number
  aspectRatio?: number
}

export interface TSNLengthValue {
  unit: TSNLengthUnit
  value: number
}

export type TSNLengthResolvable = number | TSNLengthValue

export interface TSNShadowValue {
  offsetX: number
  offsetY: number
  radius: number
  opacity: number
}

export interface TSNStyleSource {
  className?: string
  tokenRefs?: string[]
  recipe?: string
  variant?: string
}

export interface TSNLayoutStyle {
  axis?: TSNAxis
  width?: TSNLengthResolvable
  height?: TSNLengthResolvable
  minWidth?: TSNLengthResolvable
  minHeight?: TSNLengthResolvable
  maxWidth?: TSNLengthResolvable
  maxHeight?: TSNLengthResolvable
  grow?: number
  shrink?: number
  gap?: number
  marginAuto?: boolean
  paddingTop?: number
  paddingRight?: number
  paddingBottom?: number
  paddingLeft?: number
  alignItems?: TSNLayoutAlign
  justifyContent?: TSNLayoutJustify
  alignSelf?: TSNLayoutAlign
  aspectRatio?: number
}

export interface TSNVisualStyle {
  backgroundColor?: string
  foregroundColor?: string
  cornerRadius?: number
  shadow?: TSNShadowValue
  clip?: boolean
}

export interface TSNTextStyle {
  size?: number
  weight?: number
  lineHeight?: number
  tracking?: number
  transform?: TSNTextTransform
  align?: TSNTextAlign
  truncate?: boolean
  color?: string
}

export interface TSNBehavior {
  scrollAxis?: TSNAxis
  role?: string
  text?: TSNTextBehavior
}

export type TSNPropValue = string | number | boolean | TSNMediaValue | null

export interface TSNNode {
  ref: TSNNodeRef
  sourceTag?: string
  props: Record<string, TSNPropValue>
  styleSource: TSNStyleSource
  layoutStyle: TSNLayoutStyle
  visualStyle: TSNVisualStyle
  textStyle: TSNTextStyle
  behavior: TSNBehavior
  events: TSNEventBinding[]
  children: TSNNode[]
}
