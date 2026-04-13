import type { TSNNode } from '@tsn/core'

export type TSNTargetPlatform = 'macos' | 'ios'
export type UIHostBuildKind = 'native-binary' | 'xcode-app'

export interface HostNodePlan {
  id: string
  kind: string
  createCall: string
  styleCalls: string[]
  children: HostNodePlan[]
}

export interface UIHostTarget {
  key: string
  platform: TSNTargetPlatform
  displayName: string
  headerInclude: string
  runtimeRoot: string
  runtimeSource: string
  frameworkFlags: string[]
  buildKind: UIHostBuildKind
  supportsDevServer: boolean
  adaptNode(node: TSNNode): HostNodePlan
}
