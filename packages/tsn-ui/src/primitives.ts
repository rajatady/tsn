import type { TSNMediaValue, TSNNode } from '@tsn/core'

function leaf(kind: TSNNode['ref']['kind'], id: string, props: TSNNode['props']): TSNNode {
  return {
    ref: { id, kind },
    props,
    style: {},
    events: [],
    children: [],
  }
}

export function textNode(id: string, value: string): TSNNode {
  return leaf('text', id, { value })
}

export function imageNode(id: string, media: TSNMediaValue): TSNNode {
  return leaf('image', id, { media })
}

export function buttonNode(id: string, label: string, variant: string): TSNNode {
  return leaf('button', id, { label, variant })
}
