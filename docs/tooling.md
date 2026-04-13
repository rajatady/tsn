# Tooling

## CLI

```bash
tsn build <file.ts|.tsx>           # Optimized binary (-O2)
tsn build <file> --debug           # Debug binary (-O0 -g, bounds checking)
tsn dev <file.ts|.tsx>             # Watch mode, auto-recompile + relaunch
tsn run <file.ts|.tsx>             # Compile and run once
tsn inspect <command>              # Query running app
npx tsx compiler/inspect.ts <command>   # Raw inspector entrypoint
```

## Build Modes

### Release (default)

```bash
tsn build dashboard.tsx
```

- Optimization: `-O2`
- No bounds checking (zero overhead array access)
- Crash handler installed (SIGSEGV/SIGABRT → stack trace)
- No DWARF debug symbols
- Smallest binary size

### Debug

```bash
tsn build dashboard.tsx --debug
```

- Optimization: `-O0`
- Full DWARF debug symbols (`-g`)
- Bounds checking enabled (`-DTSN_DEBUG`)
- `#line` directives map C back to TypeScript source
- Array access uses `ARRAY_GET()` / `ARRAY_SET()` macros
- Out-of-bounds access reports: file, line, array name, index, length
- Works with `lldb`: `breakpoint set --file dashboard.tsx --line 160`
- Hosted async code still uses the same debug path, but it now resumes through generated frame/state-machine functions instead of blocking inside each caller frame
- Hosted timers use the same libuv loop and stay in the same native process/debugger session, so timer callbacks are debuggable with the same `lldb` and crash-trace workflow
- Hosted fetch follows the same model too: libcurl runs inside libuv worker jobs, and suspended async frames resume when the result settles
- Promise misuse now fails loudly instead of drifting into undefined behavior: pending/rejected `.value` access and promise payload mismatches raise a runtime fatal error, which keeps crash traces actionable in debug sessions

## Dev Server (Watch Mode)

```bash
tsn dev dashboard.tsx
```

- Watches ALL resolved source files for changes (100ms debounce)
- Re-resolves imports on each change (picks up new files)
- Recompiles automatically with debug flags
- Kills previous binary and relaunches on successful compile
- Shows which file changed and compile time per rebuild
- Detects crash signals and reports them (SIGSEGV, SIGABRT)
- For UI apps: saves and restores window geometry across restarts
- Rebuilds and relinks vendored runtime dependencies like Yoga/libuv through the same compiler package pipeline

Output:
```
  ┌─ TSN Dev Server ──────────────────┐
  │  Source: dashboard.tsx
  │  Binary: build/dashboard
  │  Watching for changes...               │
  └────────────────────────────────────────┘

  [14:32:01] Compiled in 655ms (176 KB)
  [14:32:15] Change detected...
  [14:32:16] Compiled in 719ms (176 KB)
```

## Error Overlay

In debug builds, runtime errors show as a **red overlay in the app window** (like Next.js error overlay):

- Dark red background covering the entire window
- Error title (e.g., "Array Index Out of Bounds")
- Source file and line number badge
- Full file path
- Error details (array name, index, length)
- Stack trace (if from crash handler)
- "TSN Error Overlay - Debug Build" watermark
- App stays alive so you can see the error
- Auto-saves screenshot to `/tmp/tsn-error.png`

The overlay appears for:
- **Array bounds errors**: `arr[99]` on a 3-element array
- **Segmentation faults**: null pointer dereference, use-after-free

Terminal output also shows colored diagnostics:
```
━━━ Array index out of bounds ━━━

  dashboard.tsx:14
  arr[99] — array length is 3

  Valid indices: 0..2
```

## Crash Handler

Installed in every binary (debug and release). Catches SIGSEGV, SIGABRT, SIGBUS.

In debug builds with `-g`, the stack trace includes TypeScript source file and line:
```
━━━ Segmentation Fault ━━━

  #0  crashNow (in test-overlay) (test-overlay.tsx:14)
  #1  _wrap_click_crashNow (in test-overlay) (build/test-overlay.c:9)
  #2  main (in test-overlay) (test-overlay.tsx:25)

  Binary: /path/to/build/test-overlay
  Debug:  lldb /path/to/build/test-overlay
```

Uses macOS `atos` with ASLR load-address resolution for symbolication.

## Inspector

Query running UI apps via Unix socket. When a single app is running, the inspector auto-discovers it. When multiple apps are running at once, target one explicitly with `--app <binary-name>`, which maps to sockets like `/tmp/tsn-inspect-dashboard.sock`.

The inspector commands are synchronous now: `click` and `type` only return after the main-thread interaction has been applied. This makes screenshot- and state-based verification reliable in automated checks.

That same CLI now works for iOS simulator builds too. macOS apps still expose a Unix socket directly; iOS simulator apps register a host-visible TCP endpoint plus simulator metadata, and `tsn inspect` abstracts the difference away. `screenshot` on iOS uses `simctl io screenshot` so the saved image lands on the host at the same `/tmp/tsn-screenshot.png` path as desktop.

The default UI verification path now includes the native gallery app at [conformance/gallery.tsx](/Users/kumardivyarajat/WebstormProjects/bun-vite/vite/conformance/gallery.tsx). `bash harness/ui-conformance.sh` builds it, launches it, drives it through the inspector, and writes screenshots plus tree dumps to `/tmp/tsn-ui-conformance`.

That matters for debugging too: the inspector path is part of the maintained verification loop, not an extra tool that only works in demos. Release and debug GUI builds go through `bash harness/gui-builds.sh`, and inspector-driven UI verification goes through `bash harness/ui-conformance.sh`.

The repo also has two additional UI verification entrypoints:

- [conformance/ui.tsx](/Users/kumardivyarajat/WebstormProjects/bun-vite/vite/conformance/ui.tsx) for interactive control/state verification
- [conformance/app-harness.ts](/Users/kumardivyarajat/WebstormProjects/bun-vite/vite/conformance/app-harness.ts) for full-page browser-oracle comparison of larger apps such as App Store and Chat

### Commands

| Command | Description |
|---------|-------------|
| `tree` | Dump full view hierarchy with types, frames, text |
| `screenshot` | Save window to `/tmp/tsn-screenshot.png` |
| `click <label>` | Click button containing label text |
| `type <text>` | Type text into search field |
| `find <text>` | Find all elements containing text (case-insensitive) |
| `get <id> [prop]` | Get element property by JSX handle ID |
| `help` | Show command list |
| `logs` | Show recent iOS simulator logs for the selected app |

### Element Properties (get command)

| Property | Returns |
|----------|---------|
| `frame` | `WxH at X,Y` (e.g., `1200x780 at 200,100`) |
| `type` | Element type (`VStack`, `HStack`, `NSTextField`, etc.) |
| `text` | Text content (for Text, Button, Search) |
| `children` | Child count |
| `hidden` | `true` or `false` |
| `flex` | Flex value |

### Usage

```bash
# While dashboard is running:
tsn inspect tree
tsn inspect find "Engineering"
tsn inspect get _j0 frame         # → 1200×780 at 200,100
tsn inspect get _j1 type          # → HStack
tsn inspect get _j1 children      # → 2 children
tsn inspect screenshot
tsn inspect click "Engineering"   # clicks the sidebar button
tsn inspect type "Alice"          # types into search field

# When multiple TSN apps are running:
npx tsx compiler/inspect.ts --app dashboard tree
npx tsx compiler/inspect.ts --app incident-tracker screenshot

# Native visual conformance
bash harness/ui-conformance.sh

# Full-page browser-oracle comparison
npx tsx conformance/app-harness.ts

# Interactive control app
./tsn build conformance/ui.tsx
```

### Element IDs

Every JSX element gets a sequential ID: `_j0` (window), `_j1` (first child), etc. These IDs are visible in the generated C code and queryable via the inspector.

## Debugging with lldb

Debug builds include DWARF symbols mapped to TypeScript source via `#line` directives.

```bash
# Compile with debug symbols
tsn build dashboard.tsx --debug

# Launch in lldb
lldb build/dashboard

# Set breakpoints on TypeScript lines
(lldb) breakpoint set --file dashboard.tsx --line 160
(lldb) run
```

For hosted async code, this still works cleanly in the current model because the compiler now emits explicit resumable frame/state-machine functions. The top-level wait still drives the hosted libuv loop in one native process, so stack traces and source mapping stay readable even though resumed async work no longer blocks each caller frame.

The same is true for the current narrow `try/catch` model: exceptions use lightweight runtime frames, but they still stay close to direct native control flow. That keeps the debugger story much simpler than it would be after full async state-machine suspension lands.

Hosted timers fit the same story right now. Their callbacks run through the shared libuv loop inside the same binary and can still be debugged through normal native breakpoints and crash traces, rather than through a separate inspector-only path. The same is true for the current async edge cases we now support, like immediate `await` on plain values, repeated waits on already-settled promises, and narrow hosted `fetch`: they stay in direct native control flow today.

The newer async failure guards fit that same model too. When a hosted async helper rejects because of an OS/libuv/transport failure, you can catch it in TSN code. When code misuses a promise value directly, the runtime aborts with an explicit fatal message instead of segfaulting from a stray payload read, so the crash handler and debugger still point at a meaningful failure site.

## Source Maps

The compiler emits `#line` directives in generated C:
```c
#line 42 "/path/to/dashboard.tsx"
    double x = ARRAY_GET(employees, i, "employees", "/path/to/dashboard.tsx", 42);
```

This means:
- Compiler errors show TypeScript file:line, not C file:line
- lldb/gdb resolve to TypeScript source
- Stack traces in crash handler show TypeScript source
- Bounds check errors report TypeScript source location
