import type { GallerySuite } from '../../../packages/tsn-testing/src/gallery'

export function gallerySuites(): GallerySuite[] {
  const suites: GallerySuite[] = [
    {
      tag: 1,
      id: 'layout',
      label: 'Layout Suite',
      description: 'Sidebars, spacers, content rails, and horizontal shelves rendered as one shell.',
      artifactPrefix: 'layout',
    },
    {
      tag: 2,
      id: 'components',
      label: 'Component Suite',
      description: 'Buttons, cards, stats, and shell building blocks in one constrained page.',
      artifactPrefix: 'components',
    },
    {
      tag: 3,
      id: 'media',
      label: 'Media Suite',
      description: 'Hero art, icons, screenshots, circular crops, and rounded media cards.',
      artifactPrefix: 'media',
    },
    {
      tag: 4,
      id: 'interactions',
      label: 'Interaction Suite',
      description: 'Search, shared store state, and click-driven changes for automated inspection.',
      artifactPrefix: 'interactions',
    },
  ]
  return suites
}

export function gallerySuiteById(id: string): GallerySuite {
  const suites: GallerySuite[] = gallerySuites()
  let i = 0
  while (i < suites.length) {
    if (suites[i].id === id) return suites[i]
    i = i + 1
  }
  return suites[0]
}

export function gallerySuiteByTag(tag: number): GallerySuite {
  const suites: GallerySuite[] = gallerySuites()
  let i = 0
  while (i < suites.length) {
    if (suites[i].tag === tag) return suites[i]
    i = i + 1
  }
  return suites[0]
}
