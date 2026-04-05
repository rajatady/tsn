# StrictTS — Agent Instructions

StrictTS is a TypeScript-to-native compiler. It takes a strict subset of TypeScript (no `any`, no `eval`, no classes, no async) and compiles it through C to ARM64 binaries. For UI apps, it compiles React-like TSX with Tailwind classes to native macOS AppKit views.

## Documentation

Read these before making changes:

| Doc | When to read |
|-----|-------------|
| [docs/language.md](docs/language.md) | Modifying the language subset, validator, or type system |
| [docs/stdlib.md](docs/stdlib.md) | Adding/changing string methods, array methods, Math, console.log |
| [docs/jsx.md](docs/jsx.md) | Adding JSX components, props, callbacks, or Tailwind classes |
| [docs/runtime.md](docs/runtime.md) | Modifying Str, arrays, refcounting, or the C runtime |
| [docs/ui-framework.md](docs/ui-framework.md) | Adding native UI components (AppKit wrappers) |
| [docs/tooling.md](docs/tooling.md) | Modifying CLI, dev server, inspector, error overlay, debugging |
| [docs/pipeline.md](docs/pipeline.md) | Changing the compilation pipeline or clang flags |
| [docs/examples.md](docs/examples.md) | Understanding the dashboard app and CLI targets |

## Architecture

```
compiler/
├── index.ts          Entry point. Resolve → validate → codegen → clang → binary.
├── resolver.ts       Multi-file import resolution. Follows imports, topological sort.
├── validator.ts      Rejects banned features (any, eval, classes, async, bare imports).
├── codegen.ts        Core AST→C generator. Accepts sourceFiles[], merges all into one .c.
├── jsx.ts            JSX elements → ui_*() C calls. Component map, callback wrappers.
├── tailwind.ts       Compile-time Tailwind className → C ui_set_*() calls.
├── dev.ts            Watch mode dev server. Watches all resolved files, recompiles on change.
├── inspect.ts        Inspector CLI client. Sends commands to running app via Unix socket.
├── runtime/
│   ├── runtime.h     Str type, StrBuf, DEFINE_ARRAY, refcounting, print functions.
│   ├── crash.h       SIGSEGV/SIGABRT handler. backtrace() + atos → TypeScript stack trace.
│   └── debug.h       Bounds checking macros (ARRAY_GET/ARRAY_SET). Error overlay callback.
examples/native-gui/
├── dashboard.tsx     Entry point: UI + state + handlers (imports from lib/).
├── lib/
│   ├── types.ts      Employee interface.
│   ├── rand.ts       PRNG functions.
│   ├── lookups.ts    Name/dept/role lookup tables.
│   ├── data.ts       Employee generation (imports types, rand, lookups).
│   └── search.ts     Fuzzy search scoring.
├── framework/
│   ├── ui.h          C API for ~60 AppKit components.
│   ├── ui.m          AppKit implementation. Layout engine, inspector, error overlay.
│   └── inspector/
│       └── inspector.m  (Duplicate of inspector code in ui.m, kept for reference.)
```

## Key Rules

1. **Every change must pass `bash harness/correctness.sh`** — 9 tests (3 targets x 3 runtimes).
2. **Compile the dashboard after changes**: `npx tsx compiler/index.ts examples/native-gui/dashboard.tsx`
3. **Test debug mode too**: `npx tsx compiler/index.ts <file> --debug` — bounds checking is only active in debug builds.
4. **No `any`, no `unknown`, no type assertions** in target TypeScript. The validator rejects them.
5. **Variables used by functions need explicit type annotations** — the compiler defaults to `double`.
6. **Semicolons before top-level JSX** — without them, `<` is parsed as less-than.
7. **`declare function` for compiler-generated functions** — e.g., `refreshTable` is auto-generated when `<Table>` has `cellFn`.

## Common Tasks

### Adding a new JSX component

1. Add the tag name to the switch in `compiler/jsx.ts` `emitElement()`
2. Use `create(...)` to emit the UIHandle (auto-registers element ID)
3. Add the C function to `examples/native-gui/framework/ui.h`
4. Implement in `examples/native-gui/framework/ui.m`
5. Document in `docs/jsx.md` and `docs/ui-framework.md`

### Adding a Tailwind class

1. Add parsing in `compiler/tailwind.ts` `parseTailwind()`
2. Map to the appropriate `ui_set_*()` call
3. Document in `docs/jsx.md` Tailwind section

### Adding a string/array method

1. Add the method handling in `compiler/codegen.ts` `emitCall()`
2. Add the C implementation in `compiler/runtime/runtime.h`
3. Document in `docs/stdlib.md`

### Adding a new validator rule

1. Add the check in `compiler/validator.ts`
2. Document in `docs/language.md` "What's Banned" section

## Testing

```bash
# Correctness: all CLI targets match expected output
bash harness/correctness.sh

# Compile all targets
npx tsx compiler/index.ts targets/json-pipeline.ts
npx tsx compiler/index.ts targets/http-router.ts
npx tsx compiler/index.ts targets/markdown-parser.ts

# Compile dashboard (release + debug)
npx tsx compiler/index.ts examples/native-gui/dashboard.tsx
npx tsx compiler/index.ts examples/native-gui/dashboard.tsx --debug

# Inspector (while app is running)
npx tsx compiler/inspect.ts tree
npx tsx compiler/inspect.ts find "Engineering"
npx tsx compiler/inspect.ts get _j0 frame
```
