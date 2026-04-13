import type { TSNNode, TSNPropValue } from '@tsn/core'

import type { HostNodePlan, UIHostTarget } from './host_target.js'
import { emitHandleCreate, emitRuntimeCalls, type HostLineEmitter } from './host_adapter.js'

export interface HostPlanEmission {
  node: TSNNode
  hostPlan: HostNodePlan
}

export interface HostPlanOverrides {
  props?: Record<string, TSNPropValue>
  rawCStringProps?: Record<string, string>
}

export function buildHostPlanEmission(
  node: TSNNode,
  hostTarget: UIHostTarget,
  overrides: HostPlanOverrides = {},
): HostPlanEmission {
  const plannedNode: TSNNode = {
    ...node,
    props: {
      ...node.props,
      ...(overrides.props ?? {}),
    },
  }

  const hostPlan = hostTarget.adaptNode(plannedNode)
  const rawValue = overrides.rawCStringProps?.value
  if (rawValue && (plannedNode.sourceTag ?? plannedNode.ref.kind) === 'Text') {
    const text = resolveTextPresentation(plannedNode.textStyle)
    hostPlan.createCall = `ui_text(${rawValue}, ${text.size}, ${text.bold ? 'true' : 'false'})`
  }

  return {
    node: plannedNode,
    hostPlan,
  }
}

export function emitHostPlan(
  push: HostLineEmitter,
  emission: HostPlanEmission,
  testId: string | null,
): void {
  emitHandleCreate(push, emission.node.ref.id, emission.hostPlan.createCall, testId)
  emitRuntimeCalls(push, emission.hostPlan.styleCalls)
}

function resolveTextPresentation(textStyle: Partial<TSNNode['textStyle']>): { size: number; bold: boolean } {
  return {
    size: textStyle.size ?? 14,
    bold: (textStyle.weight ?? -1) >= 7,
  }
}
