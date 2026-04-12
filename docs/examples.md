# Examples

## CLI Targets

Located in `targets/`. Each compiles to a native binary that produces identical output to Node.js/Bun.

### json-pipeline.ts

Processes 100K JSON records: parse, filter, sort, aggregate by city.

```bash
tsn run targets/json-pipeline.ts < harness/test-data/large-dataset.json
```

Demonstrates: JSON.parse with typed interfaces, array.filter, array.sort, struct fields, string comparison.

### http-router.ts

Route matching engine with query string parsing, 100K iterations.

```bash
tsn run targets/http-router.ts
```

Demonstrates: string.slice, string.indexOf, while loops, struct construction, pattern matching.

### markdown-parser.ts

Markdown-to-HTML converter processing 235KB input.

```bash
tsn run targets/markdown-parser.ts < harness/test-data/sample.md
```

Demonstrates: StrBuf optimization (string builder detection in loops), char-by-char parsing, string concatenation.

### csv-tool.ts

1M row CSV processing.

```bash
tsn run targets/csv-tool.ts
```

## CLI Example: Log Triage

Located in [examples/log-triage.ts](../examples/log-triage.ts). This is a native stdin-driven operations tool that turns raw log lines into an actionable summary.

It uses the newer stdlib paths directly in a non-UI workload:

- `trim()` to normalize incoming lines and messages
- `includes()` to classify incidents and actionable warnings
- `indexOf()` to parse `level=`, `service=`, `region=`, and `msg=` fields
- `join()` to print hot service lists and per-entry tag labels

Compile it with:

```bash
tsn build examples/log-triage.ts
```

## CLI Example: Config Audit

Located in [examples/config-audit.ts](../examples/config-audit.ts). This validates deployment-style env/config input and reports whether the config is production-ready.

It uses:

- `split()` for line parsing and key/value extraction
- `toUpperCase()` / `toLowerCase()` for normalization
- `some()` / `every()` / `findIndex()` for policy checks

## CLI Example: Access Log Summary

Located in [examples/access-log-summary.ts](../examples/access-log-summary.ts). This summarizes pipe-delimited access logs and reports whether critical services stayed healthy.

It uses:

- `split()` for record parsing
- `toUpperCase()` / `toLowerCase()` for normalization
- `some()` / `every()` / `findIndex()` for health checks

## CLI Example: Revenue Rollup

Located in [examples/revenue-rollup.ts](../examples/revenue-rollup.ts). This is a finance-style reporting example that turns raw CSV sales snapshots into a concise rollup.

It uses:

- `parseFloat()` / `parseInt()` for numeric parsing
- `count()` for threshold counts
- `sum()`, `min()`, and `max()` for numeric reductions

## CLI Example: SLA Scorecard

Located in [examples/sla-scorecard.ts](../examples/sla-scorecard.ts). This is a reliability/reporting example that summarizes per-service health snapshots.

It uses:

- `parseFloat()` / `parseInt()` for numeric parsing
- `count()` plus `some()` / `every()` for status checks
- `sum()`, `min()`, and `max()` for summary metrics

## Harnesses

```bash
# Existing benchmark-oriented target correctness
bash harness/correctness.sh

# Real-world CLI example correctness
bash harness/examples-correctness.sh

# Native GUI build smoke tests
bash harness/gui-builds.sh

# Geometry gallery app
./tsn build conformance/gallery.tsx
```

## Native GUI: HR Dashboard

Located in `examples/native-gui/dashboard.tsx`. A full interactive macOS application written in 100% TypeScript.

### What It Does

- Generates 50,000 employee records using a PRNG
- Displays in a native NSTableView with 7 columns
- Sidebar with department filters (click to filter)
- Search field with fuzzy matching
- KPI stat cards (total, active, avg salary, performance, departments)
- Status bar

### File Structure (multi-file imports)

```
examples/native-gui/
├── dashboard.tsx              Thin entry point: init + <App />
├── dashboard/
│   ├── app.tsx                Window composition
│   ├── components.tsx         Header, stats, toolbar, footer
│   ├── sidebar.tsx            Department navigation
│   ├── table.tsx              Native table definition
│   └── state.ts               Filtering, handlers, refreshTable usage
│
└── lib/
    ├── types.ts               Employee interface (12 lines)
    ├── rand.ts                PRNG: nextRand, randIndex (16 lines)
    ├── lookups.ts             Name/dept/role/status tables (80 lines)
    ├── data.ts                makeEmployee, generateEmployees (40 lines)
    │   import { Employee } from './types'
    │   import { nextRand, randIndex } from './rand'
    │   import { firstName, lastName, ... } from './lookups'
    │
    └── search.ts              fuzzyScore (25 lines)
```

All of these files resolve and merge into a single `build/dashboard.c`.

### Architecture

```
dashboard.tsx
    │
    ├── dashboard/app.tsx: App() root window
    │
    ├── dashboard/components.tsx: Header, metrics, toolbar, footer
    │
    ├── dashboard/sidebar.tsx: Sidebar sections and items
    │
    ├── dashboard/table.tsx: <Table> columns + cellFn wiring
    │
    ├── dashboard/state.ts: filtering logic, event handlers, refreshTable
    │
    ├── lib/types.ts: interface Employee { name, department, role, salary, performance, status }
    │
    ├── lib/lookups.ts: firstName(i), lastName(i), deptName(i), roleName(i), statusName(i)
    │   (chains of if-statements, workaround for no array literals)
    │
    ├── lib/rand.ts: nextRand(seed), randIndex(seed, max)
    │   (modulo-based, avoids bitwise AND on doubles)
    │
    ├── lib/data.ts: makeEmployee(seed) → Employee, generateEmployees(n) → Employee[]
    │   (imports types, rand, lookups)
    │
    ├── lib/search.ts: fuzzyScore(text, query) with consecutive bonus
    │
    └── App(): Window → HStack → [Sidebar, VStack → [Header, Stats, Table, StatusBar]]
```

### Key Patterns

**No closures** — callbacks take parameters:
```typescript
function onDeptClick(tag: number): void {
  deptFilterIdx = tag
  applyFilters()
  const show = filteredCount > 500 ? 500 : filteredCount
  refreshTable(show)
}
```

**Explicit type annotations** on variables used by functions:
```typescript
const emp: Employee = makeEmployee(s)   // not just: const emp = makeEmployee(s)
const tc: string = text.slice(i, i + 1) // not just: const tc = text.slice(...)
```

**`declare function` for compiler-generated functions:**
```typescript
declare function refreshTable(rows: number): void
```

**Semicolon before JSX root:**
```typescript
initFilters();   // semicolon required before <App />
```

### Compiling and Running

```bash
# Build optimized
tsn build examples/native-gui/dashboard.tsx
./build/dashboard

# Build debug (bounds checking + source maps)
tsn build examples/native-gui/dashboard.tsx --debug

# Watch mode
tsn dev examples/native-gui/dashboard.tsx
```

## CLI Example: Agent Brief

Located in [examples/agent-brief.ts](../examples/agent-brief.ts). This is the better current async showcase because it matches the present runtime honestly: a persistent terminal workflow with disk-backed session state, hosted fetch, cache fallbacks, and narrow `finally`.

It does four useful things together:

- fetches a remote release brief with explicit request headers
- reuses `etag` from disk for cache-aware revalidation
- falls back to a local cached payload on failure
- appends a persistent session log so each run resumes with prior context

That makes it much closer to the kind of “coding companion” CLI flow people actually care about. It is persistent across invocations today. A fully interactive TTY agent shell would still need richer stdin / terminal APIs than TSN currently exposes.

It also uses the real TSN stdlib import surface instead of pasted ambient declarations:

```typescript
import { readFileAsync, writeFileAsync, appendFileAsync } from "@tsn/fs"
import { fetch, Response } from "@tsn/http"
```

Build it with:

```bash
tsn build examples/agent-brief.ts
tsn build examples/agent-brief.ts --debug
```

### Binary Size

| Mode | Size |
|------|------|
| Release (-O2) | ~130 KB |
| Debug (-O0 -g) | ~180 KB |

No framework overhead. No JS engine. No Electron.

## Native GUI: Incident Tracker

Located in [examples/native-gui/incident-tracker.tsx](../examples/native-gui/incident-tracker.tsx). This is a smaller operational UI that exercises newer stdlib paths inside a real TSX app:

- `trim()` on search input
- `includes()` for issue filtering
- `indexOf()` to split project keys like `OPS-104`
- `join()` to render tag arrays in the table
- named function components with `return (...)`
- a top-level `<App />` root instead of one giant inline window tree
- a per-app folder with `app.tsx`, `components.tsx`, `sidebar.tsx`, `table.tsx`, `data.ts`, and `state.ts`

Compile it with:

```bash
tsn build examples/native-gui/incident-tracker.tsx
tsn build examples/native-gui/incident-tracker.tsx --debug
```

## Native GUI: App Store

Located in [examples/native-gui/app-store.tsx](../examples/native-gui/app-store.tsx). This is the routed flagship UI example for the current React-like slice.

It exercises:

- named function components with top-level `<App />`
- `useRoute()` for screen-level navigation
- `useStore()` for shared app state
- controlled search/input values
- horizontal scroll rails and sidebar shells
- app row click-through into detail views
- larger multi-file app organization under `examples/native-gui/app-store/`

Compile it with:

```bash
tsn build examples/native-gui/app-store.tsx
tsn build examples/native-gui/app-store.tsx --debug
```

The App Store example is paired with browser oracles under `scratch/app-store-html/` and is covered by the full-page harness in `conformance/app-harness.ts`.

## Native GUI: Chat

Located in [examples/native-gui/chat.tsx](../examples/native-gui/chat.tsx). This is the newest multi-file UI example and the best current stress test for the low-level primitive layer.

It exercises:

- simulated login plus workspace-state transitions through `useStore()`
- a sidebar, transcript, composer, file-attach dialog, and theme switching
- multiline text, wrapped message cards, and control-heavy surfaces
- a paired browser oracle under `scratch/chatgpt-html/`
- the full-page app harness path in `conformance/app-harness.ts`

Compile it with:

```bash
tsn build examples/native-gui/chat.tsx
tsn build examples/native-gui/chat.tsx --debug
```

## Native GUI: Geometry Gallery

Located in [conformance/gallery.tsx](../conformance/gallery.tsx). This is the provider-facing visual verification surface for the TSN UI stack rather than an end-user product demo.

It exercises:

- sidebar shells and spacer-to-footer layout
- centered content rails
- horizontal shelves and overflow cases
- button, view, card, stat, text, search, textarea, select, and bool-control primitives
- media hero, icon, screenshot, and circular crop cases
- shared-store interactions that can be driven through the inspector

The gallery is paired with the conformance harness:

```bash
tsn build conformance/gallery.tsx
tsn build conformance/gallery.tsx --debug
bash harness/ui-conformance.sh
```

The harness launches the gallery, clicks through the suites, captures screenshots, writes tree snapshots, and stores artifacts in `/tmp/tsn-ui-conformance`.

## UI Conformance App

Located in [conformance/ui.tsx](../conformance/ui.tsx). This is the interactive control-verification surface rather than a static geometry gallery.

It is where stateful controls and reset flows are validated:

- `Input`
- `Search`
- `TextArea`
- `Checkbox`
- `Radio`
- `Switch`
- `Select`

Compile it with:

```bash
tsn build conformance/ui.tsx
tsn build conformance/ui.tsx --debug
```

## Correctness Tests

```bash
bash harness/correctness.sh
```

Runs each CLI target with Node.js, Bun, and the native binary. Diffs output against expected results. All three must produce identical output.
