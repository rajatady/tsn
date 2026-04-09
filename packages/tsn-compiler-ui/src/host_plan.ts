import type { TSNNode, TSNPropValue } from '@tsn/core'

import { adaptNodeToAppKitPlan, type AppKitNodePlan } from '../../tsn-host-appkit/src/index.js'
import { emitHandleCreate, emitRuntimeCalls, type HostLineEmitter } from './host_adapter.js'

export interface HostPlanEmission {
  node: TSNNode
  hostPlan: AppKitNodePlan
}

export interface HostPlanOverrides {
  props?: Record<string, TSNPropValue>
  rawCStringProps?: Record<string, string>
}

export function buildHostPlanEmission(
  node: TSNNode,
  overrides: HostPlanOverrides = {},
): HostPlanEmission {
  const plannedNode: TSNNode = {
    ...node,
    props: {
      ...node.props,
      ...(overrides.props ?? {}),
    },
  }

  const hostPlan = adaptNodeToAppKitPlan(plannedNode)
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
