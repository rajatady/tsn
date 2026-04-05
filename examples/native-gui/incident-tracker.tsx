/*
 * StrictTS Native Incident Tracker
 *
 * Exercises newer stdlib paths in a real TSX app:
 *   - trim() on search input
 *   - includes() for filtering
 *   - indexOf() for project key parsing
 *   - join() for tag display
 *
 * Compile: npx tsx compiler/index.ts examples/native-gui/incident-tracker.tsx
 * Run:     ./build/incident-tracker
 */

import { App } from './incident-tracker/app'
import { initIncidentTracker } from './incident-tracker/state'

initIncidentTracker();

<App />
