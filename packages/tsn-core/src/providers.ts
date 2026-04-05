export interface LayoutProvider {
  readonly name: string
  computeLayout(treeId: string): void
}

export interface MeasureProvider {
  readonly name: string
  measureText(text: string, fontRole: string, maxWidth: number): { width: number; height: number }
}

export interface RenderProvider {
  readonly name: string
  mount(treeId: string): void
  replace(treeId: string): void
}

export interface ImageProvider {
  readonly name: string
  resolveImage(src: string): string
}

export interface TextProvider {
  readonly name: string
  fontRole(role: string): string
}

export interface ScrollProvider {
  readonly name: string
  axisSupport: Array<'horizontal' | 'vertical'>
}

export interface WindowProvider {
  readonly name: string
  supportsImmersiveChrome: boolean
}

export interface InputProvider {
  readonly name: string
  supportsSearchField: boolean
}

export interface AnimationProvider {
  readonly name: string
  supportsSharedTransitions: boolean
}

export interface AccessibilityProvider {
  readonly name: string
  exposeTree(treeId: string): string
}

export interface InspectorProvider {
  readonly name: string
  supportsScreenshots: boolean
}

export interface ThemeProvider {
  readonly name: string
  applyTheme(themeName: string): void
}

export interface TSNProviderStack {
  layout: LayoutProvider
  measure: MeasureProvider
  render: RenderProvider
  image: ImageProvider
  text: TextProvider
  scroll: ScrollProvider
  window: WindowProvider
  input: InputProvider
  animation: AnimationProvider
  accessibility: AccessibilityProvider
  inspector: InspectorProvider
  theme: ThemeProvider
}
