import * as path from 'node:path'

import type { UIHostTarget } from '../../tsn-compiler-ui/src/host_target.js'
import { adaptNodeToAppKitPlan } from '../../tsn-host-appkit/src/node_adapter.js'

export const uiKitHostRoot = path.join('packages', 'tsn-host-uikit', 'src')
export const uiKitHeaderPath = path.join(uiKitHostRoot, 'ui.h')
export const uiKitSourcePath = path.join(uiKitHostRoot, 'ui.m')

export const uiKitHostTarget: UIHostTarget = {
  key: 'uikit',
  platform: 'ios',
  displayName: 'UIKit',
  headerInclude: 'ui.h',
  runtimeRoot: uiKitHostRoot,
  runtimeSource: uiKitSourcePath,
  frameworkFlags: ['-framework UIKit', '-framework QuartzCore', '-framework CoreGraphics'],
  buildKind: 'xcode-app',
  supportsDevServer: false,
  adaptNode(node) {
    // The canonical TSN UI tree stays shared. UIKit still needs its own host
    // runtime implementation, but it can consume the same ui_* plan surface.
    return adaptNodeToAppKitPlan(node)
  },
}
