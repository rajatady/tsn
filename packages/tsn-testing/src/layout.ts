import {
  resolveLayout,
  snapshotLayout,
  type LayoutNode,
  type LayoutSize,
  type LayoutSnapshotNode,
} from '@tsn/layout'

export function resolveLayoutGolden(node: LayoutNode, viewport: LayoutSize): LayoutSnapshotNode {
  return resolveLayout(node, viewport)
}

export function serializeResolvedLayout(node: LayoutNode, viewport: LayoutSize): string {
  return snapshotLayout(resolveLayout(node, viewport))
}
