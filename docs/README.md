# TSN Documentation

TSN compiles a strict subset of TypeScript to native binaries via C. The simplified compiler is intentionally focused on non-UI programs.

## Contents

| Document | What it covers |
|----------|---------------|
| [Language Reference](./language.md) | Allowed syntax, banned features, type mappings, imports |
| [Standard Library](./stdlib.md) | Strings, arrays, Math, console, JSON, hosted APIs |
| [Runtime Internals](./runtime.md) | `Str`, arrays, refcounting, `StrBuf`, runtime helpers |
| [Tooling](./tooling.md) | CLI commands, watch mode, debug builds, crash traces |
| [Compilation Pipeline](./pipeline.md) | How `.ts` files become native binaries |
| [Examples](./examples.md) | Maintained CLI and systems-flavored example targets |

## Current Package Layout

- `packages/tsn-compiler-core` owns resolution, validation, codegen, and clang orchestration.
- `packages/tsn-core` owns shared platform and provider contracts that remain relevant outside UI.
- `packages/tsn-fs` and `packages/tsn-http` own hosted stdlib modules.
- `compiler/` remains as CLI-facing entrypoints and compatibility wrappers.

## Quick Start

```bash
./tsn build examples/access-log-summary.ts
./tsn dev examples/config-audit.ts
./tsn run examples/revenue-rollup.ts
./tsn build examples/log-triage.ts --debug
```
