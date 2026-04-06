import type { ConformanceSuite } from '../../../packages/tsn-testing/src/spec.js'
import { layoutSuite } from './layout.js'
import { contentSuite } from './content.js'
import { inputSuite } from './inputs.js'
import { mediaSuite } from './media.js'
import { dataSuite } from './data.js'

export function uiConformanceSuites(): ConformanceSuite[] {
  return [layoutSuite, contentSuite, inputSuite, mediaSuite, dataSuite]
}
