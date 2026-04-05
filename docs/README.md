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

## Writing HTTP Server Code

StrictTS now has a real HTTP server benchmark, but there are two different authoring stories today.

For Bun, you write the whole server in TypeScript. The example lives in [targets/http-server-bun.ts](../targets/http-server-bun.ts), and the shape is the one most people expect from a modern native runtime: define routes, parse the URL, and return a `Response` from a `fetch` handler.

For StrictTS, the current authoring boundary is narrower. You write the router and response-shaping logic in TypeScript in [targets/http-router.ts](../targets/http-router.ts), and that compiled router core is then hosted by the native C server shell in [harness/http-server-strictts.c](../harness/http-server-strictts.c). In other words, StrictTS can already own the route-matching and response-building logic, but it does not yet expose sockets or an Express-like `listen()` API directly in the TypeScript subset.

If you want the full side-by-side explanation and code shape, read the HTTP server sections in [tooling.md](./tooling.md) and [examples.md](./examples.md).
