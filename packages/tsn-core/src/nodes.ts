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

export interface TSNStyleValue {
  className?: string
  tokenRefs?: string[]
  recipe?: string
  variant?: string
}

export interface TSNNode {
  ref: TSNNodeRef
  props: Record<string, string | number | boolean | TSNMediaValue | null>
  style: TSNStyleValue
  events: TSNEventBinding[]
  children: TSNNode[]
}
