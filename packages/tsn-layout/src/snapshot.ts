import type { LayoutSnapshotNode } from './types.js'

export function snapshotLayout(node: LayoutSnapshotNode): string {
  return JSON.stringify(node, null, 2)
}
