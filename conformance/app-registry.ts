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
  windowTitle: string
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
    windowTitle: 'App Store',
    buildTarget: 'examples/native-gui/app-store.tsx',
    htmlOracle: 'scratch/app-store-html/discover.html',
    viewport: { width: 1400, height: 836 },  // window content area (900 - 64px title bar)
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
  {
    id: 'arcade',
    label: 'App Store — Arcade',
    app: 'app-store',
    windowTitle: 'App Store',
    buildTarget: 'examples/native-gui/app-store.tsx',
    htmlOracle: 'scratch/app-store-html/arcade.html',
    viewport: { width: 1400, height: 836 },
    navigateTo: 'nav-arcade',
    testIds: [
      'sidebar',
      'content', 'page-title',
      'hero', 'hero-img', 'hero-info', 'hero-app-icon', 'hero-view',
      'chip-row', 'chip-0', 'chip-9',
      'section-top-title', 'top-row',
      'top-0', 'top-0-icon',
      'top-1', 'top-1-icon',
      'top-2', 'top-2-icon',
      'section-what-title', 'what-row',
      'what-0', 'what-0-img',
      'what-1', 'what-1-img',
      'what-2', 'what-2-img',
      'section-perks-title', 'perks-row',
      'perk-0', 'perk-0-img',
      'perk-1', 'perk-1-img',
      'perk-2', 'perk-2-img',
      'perk-3', 'perk-3-img',
    ],
    tolerance: { position: 8, size: 8 },
  },
  {
    id: 'chat-login',
    label: 'TSN Chat — Login',
    app: 'chat',
    windowTitle: 'TSN Chat',
    buildTarget: 'examples/native-gui/chat.tsx',
    htmlOracle: 'scratch/chatgpt-html/index.html',
    viewport: { width: 1440, height: 838 },
    testIds: [
      'login-screen',
      'login-card',
      'apple-login-btn',
    ],
    tolerance: { position: 10, size: 10 },
  },
  {
    id: 'chat-workspace',
    label: 'TSN Chat — Workspace',
    app: 'chat',
    windowTitle: 'TSN Chat',
    buildTarget: 'examples/native-gui/chat.tsx',
    htmlOracle: 'scratch/chatgpt-html/app.html',
    viewport: { width: 1440, height: 838 },
    navigateTo: 'apple-login-btn',
    testIds: [
      'sidebar',
      'chat-main',
      'chat-header',
      'model-chip',
      'conversation-panel',
      'msg-user-0',
      'attached-pill-0',
      'attached-pill-1',
      'msg-assistant-0',
      'thinking-panel-0',
      'composer-wrap',
      'composer-input',
      'attach-btn',
      'send-btn',
      'context-rail',
    ],
    tolerance: { position: 12, size: 12 },
  },
]
