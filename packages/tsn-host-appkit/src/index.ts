import * as path from 'node:path'

export const appKitHostRoot = path.join('packages', 'tsn-host-appkit', 'src')
export const appKitHeaderPath = path.join(appKitHostRoot, 'ui.h')
export const appKitSourcePath = path.join(appKitHostRoot, 'ui.m')

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
