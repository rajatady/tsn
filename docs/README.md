# StrictTS Documentation

StrictTS compiles a strict subset of TypeScript to native ARM64 binaries via C. No runtime. No garbage collector. No Electron.

The compiler remains general-purpose first. The UI stack is a packaged subsystem layered on top of the same compiler pipeline, not a separate product.

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

## Current Package Layout

The implementation now lives behind `packages/tsn-*` boundaries:

- `packages/tsn-compiler-core` owns build orchestration and core codegen.
- `packages/tsn-compiler-ui` owns JSX lowering and hook/store UI codegen support.
- `packages/tsn-tailwind` owns compile-time Tailwind parsing.
- `packages/tsn-host-appkit` owns the macOS AppKit host runtime.
- `compiler/` remains as compatibility entrypoints and CLI-facing wrappers.

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
