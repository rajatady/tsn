# StrictTS Documentation

StrictTS compiles a strict subset of TypeScript to native ARM64 binaries via C. No runtime. No garbage collector. No Electron.

## Contents

| Document | What it covers |
|----------|---------------|
| [Language Reference](./language.md) | The StrictTS subset: what's allowed, what's banned, type mappings, imports |
| [Standard Library](./stdlib.md) | String methods, array methods, Math, console.log, JSON.parse |
| [JSX & Components](./jsx.md) | TSX syntax, component catalog, props, callbacks, Tailwind classes |
| [Runtime Internals](./runtime.md) | Str type, reference counting, StrBuf, DEFINE_ARRAY |
| [Native UI Framework](./ui-framework.md) | Complete C API for macOS AppKit components |
| [Tooling](./tooling.md) | CLI commands, dev server, inspector, error overlay, debugging |
| [Compilation Pipeline](./pipeline.md) | How .ts/.tsx becomes a native binary |
| [Examples](./examples.md) | Walkthrough of the dashboard app and CLI targets |

## Quick Start

```bash
# Compile a TypeScript file to native binary
./strictts build targets/http-router.ts

# Compile a TSX UI app
./strictts build examples/native-gui/dashboard.tsx

# Watch mode with auto-recompile
./strictts dev examples/native-gui/dashboard.tsx

# Compile and run
./strictts run targets/json-pipeline.ts

# Debug build (bounds checking + source maps)
./strictts build examples/native-gui/dashboard.tsx --debug
```

## Real HTTP Server Benchmark

StrictTS now includes a real socket-based HTTP benchmark alongside the older in-process router target.

Use this when you want an apples-to-apples comparison between:

- Bun's native HTTP server in [targets/http-server-bun.ts](../targets/http-server-bun.ts)
- the StrictTS-generated router wrapped in a native C server in [harness/http-server-strictts.c](../harness/http-server-strictts.c)
- the hand-written C baseline in [baselines/http-server.c](../baselines/http-server.c)

Run the full mixed-workload benchmark with:

```bash
bash harness/run-http-server-bench.sh
```

Useful knobs:

```bash
HTTP_SERVER_WORKERS=12 \
HTTP_BENCH_CONCURRENCY=256 \
HTTP_BENCH_REQUESTS=100000 \
HTTP_BENCH_WARMUP=10000 \
bash harness/run-http-server-bench.sh
```

If you want to hit one server directly, set `HTTP_SERVER_PORT` and run it yourself:

```bash
# Bun server
HTTP_SERVER_PORT=4101 bun targets/http-server-bun.ts

# StrictTS router under the native evented server shell
npx tsx compiler/index.ts targets/http-router.ts
clang -O2 -pthread -I compiler/runtime -o build/http-server-strictts harness/http-server-strictts.c -lm
HTTP_SERVER_PORT=4102 HTTP_SERVER_WORKERS=4 ./build/http-server-strictts

# Hand C baseline
clang -O2 -pthread -o build/baseline-http-server baselines/http-server.c
HTTP_SERVER_PORT=4103 HTTP_SERVER_WORKERS=4 ./build/baseline-http-server
```

Then consume the server with normal HTTP tooling:

```bash
curl http://127.0.0.1:4102/
curl "http://127.0.0.1:4102/search?q=hello&page=2&limit=20"
curl http://127.0.0.1:4102/users/42/posts/7
```
