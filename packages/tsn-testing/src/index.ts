import { snapshotLayout, type LayoutSnapshotNode } from '@tsn/layout'

export interface VisualGoldenCase {
  name: string
  screenshotPath: string
}

export function serializeLayoutGolden(node: LayoutSnapshotNode): string {
  return snapshotLayout(node)
}

export * from './layout.js'
