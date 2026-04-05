export interface HostCapabilities {
  platform: 'macos' | 'linux' | 'windows' | 'ios' | 'android' | 'unknown'
  supportsNativeSidebar: boolean
  supportsHorizontalScroll: boolean
  supportsImages: boolean
  supportsTransparentTitlebar: boolean
  supportsInspector: boolean
}

export const defaultHostCapabilities: HostCapabilities = {
  platform: 'unknown',
  supportsNativeSidebar: false,
  supportsHorizontalScroll: true,
  supportsImages: true,
  supportsTransparentTitlebar: false,
  supportsInspector: false,
}
