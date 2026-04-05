import type { TSNAxis, TSNNodeKind } from '@tsn/core'

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
}

export interface LayoutNode {
  id: string
  kind: TSNNodeKind
  axis?: TSNAxis
  constraints: LayoutConstraints
  children: LayoutNode[]
}

export interface LayoutSnapshotNode {
  id: string
  kind: TSNNodeKind
  x: number
  y: number
  width: number
  height: number
  children: LayoutSnapshotNode[]
}

export function snapshotLayout(node: LayoutSnapshotNode): string {
  return JSON.stringify(node, null, 2)
}
