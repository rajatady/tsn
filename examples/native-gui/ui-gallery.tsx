/*
 * StrictTS UI Gallery
 *
 * Provider-facing visual verification surface for the TSN UI stack.
 * It renders canonical layout, component, media, and interaction cases
 * that the native harness can inspect and snapshot.
 */

import { App } from './ui-gallery/app'
import { initGallery } from './ui-gallery/state'

initGallery();

<App />
