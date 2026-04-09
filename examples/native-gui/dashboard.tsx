/*
 * TSN Native Dashboard — 100% TypeScript
 *
 * Compiles to a native macOS binary. No Electron. No C. No JS runtime.
 *
 * Compile: npx tsx compiler/index.ts examples/native-gui/dashboard.tsx
 * Run:     ./build/dashboard
 */

import { initDashboard } from './dashboard/state'
import { App } from './dashboard/app'

initDashboard();

<App />
