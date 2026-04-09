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
packages/
├── tsn-core/         Canonical platform contracts and provider interfaces.
├── tsn-layout/       Shared layout types and future host-independent layout engine.
├── tsn-style/        Theme tokens, style contracts, recipe-level building blocks.
├── tsn-ui/           Developer-facing UI primitives plus React-like hook declarations.
├── tsn-tailwind/     Compile-time Tailwind parser and mapping layer.
├── tsn-compiler-core/
│   ├── build.ts      Resolve → validate → codegen → clang orchestration.
│   ├── codegen.ts    Core AST→C generator.
│   └── hooks.ts      useState/useRoute/useStore bookkeeping and emitted C glue.
├── tsn-compiler-ui/
│   ├── jsx.ts        JSX element emission.
│   ├── props.ts      JSX prop parsing and style/value helpers.
│   ├── callbacks.ts  Event/callback wrapper emission.
│   └── types.ts      Shared compiler-UI interfaces.
└── tsn-host-appkit/
    └── src/
        ├── ui.h      C API for the macOS AppKit host.
        ├── ui.m      AppKit compile entrypoint that assembles host subsystems.
        ├── providers.ts
        └── runtime/
            ├── windowing.inc
            ├── layout.inc
            ├── controls.inc
            ├── shell.inc
            └── inspector.inc

compiler/
├── index.ts          Compatibility entry point that forwards into the TSN compiler packages.
├── jsx.ts            Compatibility wrapper for compiler UI entrypoints.
├── tailwind.ts       Compatibility wrapper for Tailwind parsing.
├── inspect.ts        Inspector CLI client.
└── runtime/
    ├── runtime.h     Str type, StrBuf, DEFINE_ARRAY, refcounting, print functions.
    ├── crash.h       SIGSEGV/SIGABRT handler. backtrace() + atos → TypeScript stack trace.
    └── debug.h       Bounds checking macros (ARRAY_GET/ARRAY_SET). Error overlay callback.

examples/native-gui/
├── dashboard.tsx            Thin entry point → dashboard/app.tsx
├── incident-tracker.tsx     Thin entry point → incident-tracker/app.tsx
├── app-store.tsx            Thin entry point → app-store/app.tsx
├── dashboard/
├── incident-tracker/
├── app-store/
├── conformance/gallery.tsx  Geometry oracle gallery app
└── lib/
```

## Key Rules

1. **Every change must pass `bash harness/correctness.sh`** — 9 tests (3 targets x 3 runtimes).
2. **Compile the maintained UI apps after host/compiler changes**: `./strictts build examples/native-gui/dashboard.tsx`, `./strictts build examples/native-gui/incident-tracker.tsx`, `./strictts build examples/native-gui/app-store.tsx`, and `./strictts build conformance/gallery.tsx`
3. **Test debug mode too**: `./strictts build <file> --debug` — bounds checking is only active in debug builds.
4. **No `any`, no `unknown`, no type assertions** in target TypeScript. The validator rejects them.
5. **Variables used by functions need explicit type annotations** — the compiler defaults to `double`.
6. **Semicolons before top-level JSX** — without them, `<` is parsed as less-than.
7. **`declare function` for compiler-generated functions** — e.g., `refreshTable` is auto-generated when `<Table>` has `cellFn`.

## Common Tasks

### Adding a new JSX component

1. Add the tag name to the switch in `packages/tsn-compiler-ui/src/jsx.ts`
2. Use `create(...)` to emit the UIHandle (auto-registers element ID)
3. Add the C function to `packages/tsn-host-appkit/src/ui.h`
4. Implement in the appropriate AppKit host runtime fragment under `packages/tsn-host-appkit/src/runtime/` (or `ui.m` only if it is truly shared compile entry glue)
5. Add or update a case in `conformance/cases/` and wire it into `conformance/gallery.tsx`
6. Document in `docs/jsx.md` and `docs/ui-framework.md`

### Adding a Tailwind class

1. Add parsing in `packages/tsn-tailwind/src/index.ts` `parseTailwind()`
2. Map to the appropriate `ui_set_*()` call
3. Document in `docs/jsx.md` Tailwind section

### Adding a string/array method

1. Add the method handling in `packages/tsn-compiler-core/src/codegen.ts` `emitCall()`
2. Add the C implementation in `compiler/runtime/runtime.h`
3. Document in `docs/stdlib.md`

### Adding a new validator rule

1. Add the check in `packages/tsn-compiler-core/src/validator.ts` or the compatibility wrapper it forwards to
2. Document in `docs/language.md` "What's Banned" section

## Testing

```bash
# Correctness: all CLI targets match expected output
bash harness/correctness.sh

# Compile all targets
./strictts build targets/json-pipeline.ts
./strictts build targets/http-router.ts
./strictts build targets/markdown-parser.ts

# Compile maintained UI apps (release + debug)
./strictts build examples/native-gui/dashboard.tsx
./strictts build examples/native-gui/dashboard.tsx --debug
./strictts build examples/native-gui/incident-tracker.tsx
./strictts build examples/native-gui/app-store.tsx
./strictts build conformance/gallery.tsx

# Visual conformance harness
bash harness/ui-conformance.sh

# Inspector (while app is running)
npx tsx compiler/inspect.ts tree
npx tsx compiler/inspect.ts find "Engineering"
npx tsx compiler/inspect.ts get _j0 frame
npx tsx compiler/inspect.ts --app dashboard tree
```
