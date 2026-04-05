export interface GallerySuite {
  tag: number
  id: string
  label: string
  description: string
  artifactPrefix: string
}

export interface GalleryArtifact {
  suiteId: string
  treePath: string
  screenshotPath: string
}
