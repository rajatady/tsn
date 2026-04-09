export type TSNTextKind = 'static' | 'input' | 'search' | 'textarea'
export type TSNTextRole = 'body' | 'label' | 'code'
export type TSNTextWrapMode = 'wrap' | 'truncate' | 'clip'

export interface TSNTextBehavior {
  kind: TSNTextKind
  role?: TSNTextRole
  wrap: TSNTextWrapMode
  multiline: boolean
  editable: boolean
  selectable: boolean
}

export interface TSNTextMeasureRequest {
  text: string
  size: number
  weight: number
  lineHeight?: number
  tracking?: number
  role?: TSNTextRole
  wrap: TSNTextWrapMode
  multiline: boolean
  maxWidth?: number
}

export interface TSNTextMeasureResult {
  width: number
  height: number
  baseline?: number
}
