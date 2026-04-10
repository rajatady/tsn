import type {
  TSNBehavior,
  TSNLayoutStyle,
  TSNLengthUnit,
  TSNLengthValue,
  TSNTextStyle,
  TSNVisualStyle,
} from '@tsn/core'

export type LengthUnit = TSNLengthUnit
export type LengthValue = TSNLengthValue

export interface TailwindStylePatch {
  layoutStyle: Partial<TSNLayoutStyle>
  visualStyle: Partial<TSNVisualStyle>
  textStyle: Partial<TSNTextStyle>
  behavior: Partial<TSNBehavior>
}

export type TailwindOp =
  | { kind: 'flex', value: number }
  | { kind: 'spacing', value: number }
  | { kind: 'padding', top: number, right: number, bottom: number, left: number }
  | { kind: 'margin', top: number, right: number, bottom: number, left: number }
  | { kind: 'position-type', value: 'relative' | 'absolute' }
  | { kind: 'inset', top: LengthValue | null, right: LengthValue | null, bottom: LengthValue | null, left: LengthValue | null }
  | { kind: 'size', width: LengthValue | null, height: LengthValue | null }
  | { kind: 'min-size', width: LengthValue | null, height: LengthValue | null }
  | { kind: 'max-size', width: LengthValue | null, height: LengthValue | null }
  | { kind: 'aspect', width: number, height: number }
  | { kind: 'text-color-rgb', r: number, g: number, b: number, a: number }
  | { kind: 'text-color-system', color: number }
  | { kind: 'background-rgb', r: number, g: number, b: number, a: number }
  | { kind: 'border-rgb', r: number, g: number, b: number, a: number }
  | { kind: 'border-width', value: number }
  | { kind: 'corner-radius', radius: number }
  | { kind: 'align-items', value: number }
  | { kind: 'justify-content', value: number }
  | { kind: 'align-self', value: number }
  | { kind: 'margin-auto' }
  | { kind: 'shadow', offsetX: number, offsetY: number, radius: number, opacity: number }
  | { kind: 'image-scaling', value: number }
  | { kind: 'text-truncate' }
  | { kind: 'clip', value: number }
  | { kind: 'scroll-axis', value: number }

export interface TailwindResult {
  ops: TailwindOp[]
  calls: string[]
  stylePatch: TailwindStylePatch
  textSize: number
  textBold: boolean
  textWeight: number     /* -1=unset, 0=thin..4=regular..6=semibold..7=bold..9=black */
  textLineHeight: number /* -1=unset, or multiplier like 1.2 */
  textTracking: number   /* NaN=unset, or kern in points */
  textTransform: number  /* 0=none, 1=uppercase, 2=lowercase */
  textAlign: number      /* -1=unset, 0=left, 1=center, 2=right */
  width: number
  height: number
  widthValue: LengthValue | null
  heightValue: LengthValue | null
}
