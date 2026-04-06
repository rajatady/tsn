import type { ConformanceSuite } from '../../../packages/tsn-testing/src/spec.js'

export const mediaSuite: ConformanceSuite = {
  id: 'media',
  label: 'Media Suite',
  navLabel: 'Media Suite',
  navTestId: 'suite.media',
  navTag: 4,
  covers: ['Image'],
  description: 'Image primitives, hero media, icons, and paired screenshots.',
  artifactPrefix: 'media',
  cases: [
    {
      id: 'hero-image',
      label: 'hero image primitive',
      actions: [],
      expects: [
        { kind: 'property', id: 'media.hero', prop: 'type', includes: 'NSImageView' },
        { kind: 'frame', id: 'media.hero', minWidth: 1000, minHeight: 380 },
      ],
    },
    {
      id: 'icon-row',
      label: 'icon image set',
      actions: [],
      expects: [
        { kind: 'property', id: 'media.icon.row', prop: 'type', includes: 'HStack' },
        { kind: 'frame', id: 'media.icon.1', minWidth: 60, minHeight: 60, maxWidth: 80 },
        { kind: 'frame', id: 'media.icon.2', minWidth: 60, minHeight: 60, maxWidth: 80 },
        { kind: 'frame', id: 'media.icon.3', minWidth: 60, minHeight: 60, maxWidth: 80 },
      ],
    },
    {
      id: 'paired-screenshots',
      label: 'paired screenshot layout',
      actions: [],
      expects: [
        { kind: 'property', id: 'media.screens.row', prop: 'type', includes: 'HStack' },
        { kind: 'frame', id: 'media.screen.1', minWidth: 500, minHeight: 280 },
        { kind: 'frame', id: 'media.screen.2', minWidth: 500, minHeight: 280 },
      ],
    },
  ],
}
