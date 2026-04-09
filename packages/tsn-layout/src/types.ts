import type { TSNAxis, TSNLayoutAlign, TSNLayoutJustify, TSNLayoutStyle, TSNNodeKind } from '@tsn/core'

export type LayoutAlign = TSNLayoutAlign
export type LayoutJustify = TSNLayoutJustify
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

export type LayoutConstraints = TSNLayoutStyle

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
