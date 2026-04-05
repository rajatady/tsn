# Tooling

## CLI

```bash
strictts build <file.ts|.tsx>           # Optimized binary (-O2)
strictts build <file> --debug           # Debug binary (-O0 -g, bounds checking)
strictts dev <file.ts|.tsx>             # Watch mode, auto-recompile + relaunch
strictts run <file.ts|.tsx>             # Compile and run once
strictts inspect <command>              # Query running app
```

## Build Modes

### Release (default)

```bash
strictts build dashboard.tsx
```

- Optimization: `-O2`
- No bounds checking (zero overhead array access)
- Crash handler installed (SIGSEGV/SIGABRT → stack trace)
- No DWARF debug symbols
- Smallest binary size

### Debug

```bash
strictts build dashboard.tsx --debug
```

- Optimization: `-O0`
- Full DWARF debug symbols (`-g`)
- Bounds checking enabled (`-DSTRICTTS_DEBUG`)
- `#line` directives map C back to TypeScript source
- Array access uses `ARRAY_GET()` / `ARRAY_SET()` macros
- Out-of-bounds access reports: file, line, array name, index, length
- Works with `lldb`: `breakpoint set --file dashboard.tsx --line 160`

## Dev Server (Watch Mode)

```bash
strictts dev dashboard.tsx
```

- Watches ALL resolved source files for changes (100ms debounce)
- Re-resolves imports on each change (picks up new files)
- Recompiles automatically with debug flags
- Kills previous binary and relaunches on successful compile
- Shows which file changed and compile time per rebuild
- Detects crash signals and reports them (SIGSEGV, SIGABRT)
- For UI apps: saves and restores window geometry across restarts

Output:
```
  ┌─ StrictTS Dev Server ──────────────────┐
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
- "StrictTS Error Overlay - Debug Build" watermark
- App stays alive so you can see the error
- Auto-saves screenshot to `/tmp/strictts-error.png`

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

Query running UI apps via Unix socket at `/tmp/strictts-inspect.sock`.

### Commands

| Command | Description |
|---------|-------------|
| `tree` | Dump full view hierarchy with types, frames, text |
| `screenshot` | Save window to `/tmp/strictts-screenshot.png` |
| `click <label>` | Click button containing label text |
| `type <text>` | Type text into search field |
| `find <text>` | Find all elements containing text (case-insensitive) |
| `get <id> [prop]` | Get element property by JSX handle ID |
| `help` | Show command list |

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
strictts inspect tree
strictts inspect find "Engineering"
strictts inspect get _j0 frame         # → 1200×780 at 200,100
strictts inspect get _j1 type          # → HStack
strictts inspect get _j1 children      # → 2 children
strictts inspect screenshot
strictts inspect click "Engineering"   # clicks the sidebar button
strictts inspect type "Alice"          # types into search field
```

### Element IDs

Every JSX element gets a sequential ID: `_j0` (window), `_j1` (first child), etc. These IDs are visible in the generated C code and queryable via the inspector.

## Debugging with lldb

Debug builds include DWARF symbols mapped to TypeScript source via `#line` directives.

```bash
# Compile with debug symbols
strictts build dashboard.tsx --debug

# Launch in lldb
lldb build/dashboard

# Set breakpoints on TypeScript lines
(lldb) breakpoint set --file dashboard.tsx --line 160
(lldb) run
```

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

## HTTP Server Benchmark

StrictTS has two different HTTP workloads now:

- [targets/http-router.ts](../targets/http-router.ts) is the original in-process router benchmark.
- [harness/run-http-server-bench.sh](../harness/run-http-server-bench.sh) is the real HTTP/1.1 socket benchmark.

The real server benchmark compares three implementations on the same mixed route set:

- [targets/http-server-bun.ts](../targets/http-server-bun.ts)
- [harness/http-server-strictts.c](../harness/http-server-strictts.c) plus the generated `build/http-router.c`
- [baselines/http-server.c](../baselines/http-server.c)

### Run The Full Benchmark

```bash
bash harness/run-http-server-bench.sh
```

Environment variables:

- `HTTP_SERVER_WORKERS` controls server workers.
- `HTTP_BENCH_CONCURRENCY` controls benchmark client concurrency.
- `HTTP_BENCH_REQUESTS` controls measured request count.
- `HTTP_BENCH_WARMUP` controls warmup request count.

Example:

```bash
HTTP_SERVER_WORKERS=12 \
HTTP_BENCH_CONCURRENCY=256 \
HTTP_BENCH_REQUESTS=100000 \
HTTP_BENCH_WARMUP=10000 \
bash harness/run-http-server-bench.sh
```

### Run One Server Directly

```bash
# Bun
HTTP_SERVER_PORT=4101 bun targets/http-server-bun.ts

# StrictTS+C
npx tsx compiler/index.ts targets/http-router.ts
clang -O2 -pthread -I compiler/runtime -o build/http-server-strictts harness/http-server-strictts.c -lm
HTTP_SERVER_PORT=4102 HTTP_SERVER_WORKERS=4 ./build/http-server-strictts

# Hand C
clang -O2 -pthread -o build/baseline-http-server baselines/http-server.c
HTTP_SERVER_PORT=4103 HTTP_SERVER_WORKERS=4 ./build/baseline-http-server
```

Consume the running server with regular HTTP requests:

```bash
curl http://127.0.0.1:4102/
curl http://127.0.0.1:4102/users/42
curl "http://127.0.0.1:4102/search?q=hello&page=2&limit=20"
curl http://127.0.0.1:4102/api/v1/health
```

The benchmark driver used by the harness is the native C client in [harness/http-server-bench.c](../harness/http-server-bench.c), not the older Python prototype.
