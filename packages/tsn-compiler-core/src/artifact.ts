import type { TSNTargetPlatform } from '../../tsn-compiler-ui/src/host_target.js'

export interface NativeBinaryArtifact {
  kind: 'native-binary'
  platform: TSNTargetPlatform
  path: string
}

export interface AppBundleArtifact {
  kind: 'app-bundle'
  platform: TSNTargetPlatform
  path: string
  bundleId: string
  executableName: string
}

export type BuildArtifact = NativeBinaryArtifact | AppBundleArtifact
