# Execution Sequence

This file is the sequencing contract for stabilizing the current compiler before new language features are added.

## Execution Order

1. Move the current compiler tests into module-shaped test files.
2. Expand coverage until strings, arrays, classes, functions, control flow, JSON, top-level init, and validator policy all have real edge-case coverage.
3. Fix the known validator import-filter bug so bare-import diagnostics are testable.
4. Only after coverage is acceptable, start extracting `codegen.ts` into modules.
5. After each extraction step, run:
   - package compiler tests
   - unit tests
   - targeted existing harnesses only if the moved subsystem can affect them
6. When `codegen.ts` is reduced to a thin coordinator or removed, add missing existing-behavior tests discovered during the split.
7. Only then start new feature work such as `switch`, `try/catch`, `async/await`, nullability, `Map` / `Set`, and broader generics.

## No-Sprawl Rule

- no new language features before the current feature matrix is stabilized
- no semantic changes hidden inside refactors
- no new tests as a single catch-all file
- every new supported feature must name its owner module and its test module

## Test Cases and Scenarios To Add Before Refactor

Expand existing thin coverage into these concrete cases:

- Strings:
  `slice`, `indexOf`, `indexOf(fromIndex)`, `trim`, `trimStart`, `trimEnd`, `toLowerCase`, `toUpperCase`, `includes`, `startsWith`, `endsWith`, `split`, template literals, concat flattening, char compare optimization exact-pattern case
- Arrays:
  empty literal, non-empty literal, `push`, `slice`, `map`, `filter`, `reduce`, `forEach`, `some`, `every`, `findIndex`, `count`, `join`, `includes`, `indexOf`, `sum`, `min`, `max`, `sort`, array indexing get/set, `for...of`
- Classes:
  field assignment, constructor initialization, method calls, `this`, nested class references, generic monomorphization, object-valued fields, array-valued fields, visibility placeholders
- Functions:
  return inference, destructured parameters, callback lowering, top-level globals referenced inside functions
- Control flow:
  nested loops, cleanup after loop locals, conditional expressions, returns with cleanup
- JSON:
  typed array parse, unknown-field skip, string/number/bool fields
- Hosted builtins:
  file helpers and process helper lowering
- Validator:
  every current permanent ban plus every current temporary restriction, with one test per policy item
- Known current gap:
  bare-import diagnostic bug must become a failing behavioral test before fixing

## Assumptions and Defaults

- `.plans/` is a planning artifact directory only. It is not a runtime or compiler concept.
- “Phase 1” means “default TSN language experience for a normal professional TypeScript developer,” not a selectable compiler mode.
- Existing `harness/` tests remain the end-to-end safety net; package-local compiler tests become the fast inner loop.
- `compiler/stdlib` should not absorb the whole backend. If those helpers are eventually moved, they should move into `packages/tsn-compiler-core/src/codegen/` as builtin-lowering modules.
- Coverage is used as a signal, not as the only truth. The acceptance bar is broad behavior coverage across planned modules, not a vanity line-percentage target.
