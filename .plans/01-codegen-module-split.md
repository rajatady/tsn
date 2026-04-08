# Codegen Module Split Contract

This file defines the target structure for splitting the current god file, [codegen.ts](/Users/kumardivyarajat/.codex/worktrees/94d7/vite/packages/tsn-compiler-core/src/codegen.ts), into real modules under `packages/tsn-compiler-core/src/codegen/`. No new feature work should continue accumulating in the god file once this split begins.

## Target Structure

Target structure under `packages/tsn-compiler-core/src/`:

- `codegen/context.ts`
  shared compiler state: symbol tables, temp ids, source mapping, builder state, current class, hook registry bridge
- `codegen/types.ts`
  TSN type names, C type mapping, array type names, class/generic type resolution
- `codegen/expr.ts`
  expression lowering only
- `codegen/stmt.ts`
  statement lowering only
- `codegen/functions.ts`
  function signature inference and function emission
- `codegen/classes.ts`
  class parsing, class registration, monomorphization, constructor/method emission
- `codegen/top-level.ts`
  globals, initialization, entrypoint assembly, top-level statement handling
- `codegen/json.ts`
  generated JSON parser emission
- `codegen/lifetime.ts`
  release-on-reassign, scope cleanup, return cleanup
- `codegen/builtins-strings.ts`
  compiler-side lowering for string methods
- `codegen/builtins-arrays.ts`
  compiler-side lowering for array methods
- `codegen/builtins-hosted.ts`
  compiler-side lowering for hosted builtins like file/process/runtime helpers
- `codegen/program.ts`
  final C assembly and public `generateC` / `generateCSingle`

Keep `packages/tsn-compiler-ui` separate. Do not fold JSX lowering into the compiler-core split.

## Extraction Order

The extraction order is fixed so the split stays low-risk and reviewable:

1. `types.ts`
2. `context.ts`
3. `builtins-strings.ts` and `builtins-arrays.ts`
4. `expr.ts`
5. `stmt.ts`
6. `functions.ts`
7. `classes.ts`
8. `lifetime.ts`
9. `json.ts`
10. `top-level.ts`
11. `program.ts`

## Rules During Extraction

No semantic changes during extraction. If a behavior bug is discovered, record it and fix it in a follow-up pass, not during the move.

The point of this split is not to redesign the language in-flight. The point is to make ownership of existing behavior legible, testable, and maintainable before further feature work lands.
