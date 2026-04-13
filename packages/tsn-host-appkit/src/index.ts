import * as path from 'node:path'

import type { UIHostTarget } from '../../tsn-compiler-ui/src/host_target.js'
import { adaptNodeToAppKitPlan } from './node_adapter.js'

export const appKitHostRoot = path.join('packages', 'tsn-host-appkit', 'src')
export const appKitHeaderPath = path.join(appKitHostRoot, 'ui.h')
export const appKitSourcePath = path.join(appKitHostRoot, 'ui.m')

export { adaptNodeToAppKitPlan, type AppKitNodePlan } from './node_adapter.js'
export {
  buildTextMeasureRequest,
  defaultCssLineHeightForSize as appKitDefaultCssLineHeightForSize,
  measureTextRequest as appKitMeasureTextRequest,
} from './text_adapter.js'

export {
  appKitAccessibilityProvider,
  appKitAnimationProvider,
  appKitImageProvider,
  appKitInputProvider,
  appKitInspectorProvider,
  appKitLayoutProvider,
  appKitMeasureProvider,
  appKitRenderProvider,
  appKitScrollProvider,
  appKitTextProvider,
  appKitThemeProvider,
  appKitWindowProvider,
  createAppKitProviderStack,
} from './providers.js'

export const appKitHostTarget: UIHostTarget = {
  key: 'appkit',
  platform: 'macos',
  displayName: 'AppKit',
  headerInclude: 'ui.h',
  runtimeRoot: appKitHostRoot,
  runtimeSource: appKitSourcePath,
  frameworkFlags: ['-framework Cocoa', '-framework QuartzCore'],
  buildKind: 'native-binary',
  supportsDevServer: true,
  adaptNode: adaptNodeToAppKitPlan,
}
