/**
 * Full-Page Geometry Oracle Registry
 *
 * Each entry defines an app screen with its HTML oracle file
 * and the list of data-testid elements to compare between
 * native (inspector) and browser (Playwright).
 */

export interface AppScreen {
  id: string
  label: string
  app: string                    // app name for inspector socket
  buildTarget: string            // TSX entry point to compile
  htmlOracle: string             // path to HTML oracle file
  viewport: { width: number, height: number }
  navigateTo?: string            // inspector clickid to navigate to this screen
  testIds: string[]              // elements to compare geometry
  tolerance: { position: number, size: number }
}

export const appScreens: AppScreen[] = [
  {
    id: 'discover',
    label: 'App Store — Discover',
    app: 'app-store',
    buildTarget: 'examples/native-gui/app-store.tsx',
    htmlOracle: 'scratch/app-store-html/discover.html',
    viewport: { width: 1400, height: 838 },  // window content area (minus title bar)
    testIds: [
      // Sidebar
      'sidebar',
      // Content
      'content', 'page-title',
      // Hero
      'hero', 'hero-img',
      // Editorial cards
      'editorial-row',
      'editorial-0', 'editorial-0-img',
      'editorial-1', 'editorial-1-img',
      'editorial-2', 'editorial-2-img',
      // App grid
      'section-apps-title', 'app-grid',
      'app-col-0', 'app-col-1', 'app-col-2',
      'app-0-0', 'app-0-0-icon',
      'app-1-0', 'app-1-0-icon',
      'app-2-0', 'app-2-0-icon',
      // Game cards
      'section-games-title', 'games-row',
      'game-0', 'game-0-img',
      'game-1', 'game-1-img',
      'game-2', 'game-2-img',
    ],
    tolerance: { position: 8, size: 8 },
  },
]
