import type { UIHostTarget } from '../../tsn-compiler-ui/src/host_target.js'
import { appKitHostTarget } from '../../tsn-host-appkit/src/index.js'
import { uiKitHostTarget } from '../../tsn-host-uikit/src/index.js'

const uiTargetsByPlatform: Record<string, UIHostTarget> = {
  macos: appKitHostTarget,
  ios: uiKitHostTarget,
}

export function resolveUIHostTarget(platform: string): UIHostTarget {
  const target = uiTargetsByPlatform[platform]
  if (!target) {
    throw new Error(`Unsupported UI platform "${platform}"`)
  }
  return target
}
