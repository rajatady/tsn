import type {
  AccessibilityProvider,
  AnimationProvider,
  ImageProvider,
  InputProvider,
  InspectorProvider,
  LayoutProvider,
  MeasureProvider,
  RenderProvider,
  ScrollProvider,
  TextProvider,
  ThemeProvider,
  TSNProviderStack,
  WindowProvider,
} from '@tsn/core'

export const appKitLayoutProvider: LayoutProvider = {
  name: 'appkit-layout',
  computeLayout(): void {},
}

export const appKitMeasureProvider: MeasureProvider = {
  name: 'appkit-measure',
  measureText(text: string, _fontRole: string, maxWidth: number): { width: number; height: number } {
    const clampedWidth = maxWidth > 0 ? Math.min(maxWidth, text.length * 8) : text.length * 8
    return { width: clampedWidth, height: 18 }
  },
}

export const appKitRenderProvider: RenderProvider = {
  name: 'appkit-render',
  mount(): void {},
  replace(): void {},
}

export const appKitImageProvider: ImageProvider = {
  name: 'appkit-image',
  resolveImage(src: string): string {
    return src
  },
}

export const appKitTextProvider: TextProvider = {
  name: 'appkit-text',
  fontRole(role: string): string {
    return role
  },
}

export const appKitScrollProvider: ScrollProvider = {
  name: 'appkit-scroll',
  axisSupport: ['horizontal', 'vertical'],
}

export const appKitWindowProvider: WindowProvider = {
  name: 'appkit-window',
  supportsImmersiveChrome: true,
}

export const appKitInputProvider: InputProvider = {
  name: 'appkit-input',
  supportsSearchField: true,
}

export const appKitAnimationProvider: AnimationProvider = {
  name: 'appkit-animation',
  supportsSharedTransitions: false,
}

export const appKitAccessibilityProvider: AccessibilityProvider = {
  name: 'appkit-accessibility',
  exposeTree(treeId: string): string {
    return treeId
  },
}

export const appKitInspectorProvider: InspectorProvider = {
  name: 'appkit-inspector',
  supportsScreenshots: true,
}

export const appKitThemeProvider: ThemeProvider = {
  name: 'appkit-theme',
  applyTheme(): void {},
}

export function createAppKitProviderStack(): TSNProviderStack {
  return {
    layout: appKitLayoutProvider,
    measure: appKitMeasureProvider,
    render: appKitRenderProvider,
    image: appKitImageProvider,
    text: appKitTextProvider,
    scroll: appKitScrollProvider,
    window: appKitWindowProvider,
    input: appKitInputProvider,
    animation: appKitAnimationProvider,
    accessibility: appKitAccessibilityProvider,
    inspector: appKitInspectorProvider,
    theme: appKitThemeProvider,
  }
}
