import type { TSNAxis, TSNNodeKind } from '@tsn/core'

export type LayoutAlign = 'start' | 'center' | 'end' | 'stretch'
export type LayoutJustify = 'start' | 'center' | 'end' | 'space-between'
export type LayoutRole = 'node' | 'spacer' | 'content-rail'

export interface LayoutSize {
  width: number
  height: number
}

export interface LayoutFrame extends LayoutSize {
  x: number
  y: number
}

export interface LayoutInsets {
  top: number
  right: number
  bottom: number
  left: number
}

export interface LayoutConstraints {
  width?: number
  height?: number
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  grow?: number
  shrink?: number
  gap?: number
  paddingTop?: number
  paddingRight?: number
  paddingBottom?: number
  paddingLeft?: number
  alignSelf?: LayoutAlign
  aspectRatio?: number
}

export interface LayoutNode {
  id: string
  kind: TSNNodeKind
  axis?: TSNAxis
  role?: LayoutRole
  alignItems?: LayoutAlign
  justifyContent?: LayoutJustify
  constraints: LayoutConstraints
  intrinsicWidth?: number
  intrinsicHeight?: number
  children: LayoutNode[]
}

export interface LayoutSnapshotNode extends LayoutFrame {
  id: string
  kind: TSNNodeKind
  role: LayoutRole
  contentWidth: number
  contentHeight: number
  children: LayoutSnapshotNode[]
}
