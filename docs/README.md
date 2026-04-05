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
