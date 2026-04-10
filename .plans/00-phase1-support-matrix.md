# Phase 1 Support Matrix

This file is the Phase 1 language catalogue. It records what a normal professional TypeScript developer should be able to expect from TSN, what is already supported, what is partial, and what is still missing. This is not a compiler mode or user-selectable profile. It is the planning reference for the default TSN language experience.

## Support Table

| Feature | Bucket | Phase 1 | Current Status | Target Owner Module | Test Module | Notes |
|---|---|---:|---:|---|---|---|
| `let` / `const` | Type | Yes | Done | `codegen/stmt.ts` | `test/stmt/control-flow.test.ts` | Keep `var` banned. |
| Local type inference | Type | Yes | Partial | `codegen/types.ts` | `test/types/inference.test.ts` | Current inference is usable but still brittle. |
| Function declarations | Type | Yes | Done | `codegen/functions.ts` | `test/functions/functions.test.ts` | Keep return inference, prefer explicit parameter typing. |
| Arrow functions in callbacks | Type | Yes | Done | `codegen/expr.ts` + `codegen/builtins-arrays.ts` | `test/functions/callbacks.test.ts` | Already important for array helpers. |
| Closure capture semantics | Memory | Yes | Partial | `codegen/expr.ts` + later semantic pass | `test/functions/callbacks.test.ts` | Freeze current behavior first; do not expand semantics yet. |
| `if` / `else` / ternary | Type | Yes | Done | `codegen/stmt.ts` / `codegen/expr.ts` | `test/stmt/control-flow.test.ts` | Existing behavior should be frozen. |
| `while` / `for` | Type | Yes | Done | `codegen/stmt.ts` | `test/stmt/control-flow.test.ts` | Add edge cases around nested loops and cleanup. |
| `for...of` on arrays | Type | Yes | Done | `codegen/stmt.ts` | `test/stmt/for-of.test.ts` | Keep array-only semantics for now. |
| `switch` | Type | Yes | Not done | `codegen/stmt.ts` | `test/stmt/switch.test.ts` | Missing Phase 1 feature. |
| `break` / `continue` | Type | Yes | Done | `codegen/stmt.ts` | `test/stmt/control-flow.test.ts` | Add nested-loop coverage. |
| Interfaces as plain data | Type | Yes | Done | `codegen/types.ts` + `codegen/expr.ts` | `test/types/interfaces.test.ts` | Keep value semantics explicit. |
| Classes | Type | Yes | Partial | `codegen/classes.ts` | `test/classes/classes.test.ts` | Must freeze current constructor/field/method behavior before refactor. |
| Constructors / methods / `this` | Type | Yes | Partial | `codegen/classes.ts` | `test/classes/classes.test.ts` | Current lowering works, needs broader cases. |
| `private` members | Type | Yes | Partial | `codegen/classes.ts` + validator policy | `test/classes/visibility.test.ts` | Current parsing exists; enforcement is incomplete. |
| Static members | Type | Nice | Not done | `codegen/classes.ts` | `test/classes/static.test.ts` | Do not implement yet. |
| Inheritance / `extends` / `super` | Type | Nice | Not done | `codegen/classes.ts` | `test/classes/inheritance.test.ts` | Out of current scope. |
| Generic classes | Type | Yes | Partial | `codegen/classes.ts` | `test/classes/generics.test.ts` | Narrow monomorphization only for now. |
| Generic functions | Type | Yes | Not done | `codegen/functions.ts` + `codegen/types.ts` | `test/functions/generics.test.ts` | Missing Phase 1 feature. |
| Multiple type parameters | Type | Nice | Not done | `codegen/types.ts` | `test/functions/generics.test.ts` | Later. |
| Type aliases | Type | Yes | Partial | `codegen/types.ts` | `test/types/aliases.test.ts` | Need explicit semantics, not accidental passthrough. |
| Unions | Type | Yes | Partial | `codegen/types.ts` | `test/types/unions.test.ts` | Freeze current lack/partial handling; no new semantics yet. |
| Discriminated unions | Type | Yes | Partial | `codegen/types.ts` | `test/types/unions.test.ts` | Important eventual Phase 1 feature. |
| Tuples | Type | Yes | Not done | `codegen/types.ts` | `test/types/tuples.test.ts` | Missing. |
| Enums | Type | Nice | Not done | `codegen/types.ts` | `test/types/enums.test.ts` | Later. |
| `number` | Type | Yes | Partial | `codegen/types.ts` | `test/types/primitives.test.ts` | Current semantics are “all doubles.” Freeze that explicitly. |
| `string` | Memory | Yes | Done | `codegen/builtins-strings.ts` + runtime | `test/strings/strings.test.ts` | One of the strongest current areas. |
| `boolean` | Type | Yes | Done | `codegen/types.ts` | `test/types/primitives.test.ts` | Add mixed expression cases. |
| `null` / `undefined` / optionality | Type | Yes | Not done | `codegen/types.ts` + validator policy | `test/types/nullability.test.ts` | Missing Phase 1 feature. |
| Optional chaining `?.` | Type | Yes | Not done | `codegen/expr.ts` | `test/types/nullability.test.ts` | Missing. |
| Nullish coalescing `??` | Type | Yes | Not done | `codegen/expr.ts` | `test/types/nullability.test.ts` | Missing. |
| Integer-style library types (`i32`, `u64`) | Type | Yes | Not done | Later separate package | `test/types/int-types.test.ts` | Phase 1-worthy, but not to be mixed into current cleanup. |
| Arrays | Memory | Yes | Done | `codegen/types.ts` + `codegen/builtins-arrays.ts` | `test/arrays/arrays.test.ts` | Add tests for ownership-sensitive cases. |
| Array indexing | Memory | Yes | Done | `codegen/expr.ts` / `codegen/stmt.ts` | `test/arrays/indexing.test.ts` | Cover get/set/compound assignment. |
| Array literals | Type | Yes | Partial | `codegen/expr.ts` / `codegen/stmt.ts` | `test/arrays/literals.test.ts` | Empty vs non-empty needs explicit coverage. |
| `map` / `filter` / `reduce` | Memory | Yes | Done | `codegen/builtins-arrays.ts` | `test/arrays/hof.test.ts` | Add nested callback and return-type edge cases. |
| `some` / `every` / `findIndex` / `count` | Memory | Yes | Done | `codegen/builtins-arrays.ts` | `test/arrays/hof.test.ts` | Add string/object element cases. |
| `sort` | Memory | Yes | Done | `codegen/builtins-arrays.ts` | `test/arrays/sort.test.ts` | Cover comparator lifting and struct sorting. |
| `join` / `slice` / `includes` / `indexOf` | Memory | Yes | Done | `codegen/builtins-arrays.ts` | `test/arrays/arrays.test.ts` | Add bool/string/number variants. |
| Numeric reductions `sum` / `min` / `max` | Memory | Yes | Done | `codegen/builtins-arrays.ts` | `test/arrays/reductions.test.ts` | Add empty-array cases. |
| Object literals | Type | Yes | Done | `codegen/expr.ts` | `test/objects/objects.test.ts` | Add nested object/array field cases. |
| Object destructuring | Type | Yes | Partial | `codegen/functions.ts` and later stmt support | `test/objects/destructuring.test.ts` | Param destructuring exists; general local destructuring does not. |
| Array destructuring | Type | Yes | Not done | `codegen/stmt.ts` + validator | `test/objects/destructuring.test.ts` | Current hook-only support should be frozen. |
| Spread / rest | Memory | Yes | Not done | `codegen/expr.ts` / `codegen/functions.ts` | `test/objects/spread-rest.test.ts` | Missing. |
| String literals / templates / concat | Memory | Yes | Done | `codegen/builtins-strings.ts` + `codegen/expr.ts` | `test/strings/strings.test.ts` | Expand edge-case coverage. |
| String methods | Memory | Yes | Done | `codegen/builtins-strings.ts` | `test/strings/methods.test.ts` | Split tests by method family. |
| `String.fromCharCode` | Type | Nice | Done | `codegen/builtins-strings.ts` | `test/strings/methods.test.ts` | Freeze exact behavior. |
| `console.log` | Effect | Yes | Done | `codegen/builtins-hosted.ts` or `codegen/expr.ts` | `test/effects/console.test.ts` | Cover flattening and mixed argument types. |
| `JSON.parse` to typed data | Effect | Yes | Partial | `codegen/json.ts` | `test/effects/json.test.ts` | Add object/array/string/unknown-field cases. |
| File builtins (`readFile`, `writeFile`, etc.) | Effect | Yes | Partial | `codegen/builtins-hosted.ts` | `test/effects/fs-builtins.test.ts` | Freeze current lowering before redesign. |
| Process builtin (`exec`) | Effect | Nice | Done | `codegen/builtins-hosted.ts` | `test/effects/process.test.ts` | Keep tested, but not central to Phase 1 ergonomics. |
| `try` / `catch` / `finally` | Effect | Yes | Partial | `codegen/stmt.ts` + `runtime_exception.h` | `test/effects/exceptions.test.ts` | `try/catch` works in the narrow model; `finally` is still unsupported. |
| `throw` | Effect | Yes | Partial | `codegen/stmt.ts` + `runtime_exception.h` | `test/effects/exceptions.test.ts` | Sync throw works and async throw can reject promises; typed error model is still narrow. |
| `async` / `await` / `Promise` | Effect | Yes | Partial | `async-lowering.ts` + hosted runtime | `test/effects/async.test.ts` and `test/effects/async-errors.test.ts` | Real hosted async works now, including direct-value await, repeated awaits on shared promise state, guarded promise value access, and catchable OS/libuv failures, but `await` still blocks the current frame and state-machine lowering is still pending. |
| Timer APIs (`setTimeout` / `setInterval`) | Effect | Yes | Partial | `builtins-timers.ts` + `runtime_timers.h` | `test/effects/timers.test.ts` | Hosted timers are libuv-backed now, but callback forms are intentionally narrow and timer promises are not implemented yet. |
| `fetch` / `Response` | Effect | Yes | Partial | `builtins-hosted.ts` + `runtime_fetch.h` | `test/effects/fetch.test.ts` | Hosted fetch now works with narrow `Response` support and explicit transport/libuv rejection paths, but headers, cancellation, streaming, and richer response helpers are still pending. |
| Bare package imports | Effect | Yes | Not done | resolver + validator | `test/effects/modules.test.ts` | Current validator bug should be fixed after behavior freeze. |

## Validator Never-Allow Policy

These are the permanent or temporary bans that must stay explicit in the planning record. For each item, the notes say whether it is a permanent TSN ban, a temporary Phase 1 target, or a temporary implementation restriction.

| Feature | Bucket | Phase 1 | Current Status | Target Owner Module | Test Module | Notes |
|---|---|---:|---:|---|---|---|
| `any` | Type | No | Banned | `validator.ts` | `test/validator/policy.test.ts` | permanent TSN ban |
| `unknown` | Type | No | Banned | `validator.ts` | `test/validator/policy.test.ts` | temporary restriction caused by current implementation; decision to keep or relax must be written explicitly |
| Type assertions (`as`) | Type | No | Banned | `validator.ts` | `test/validator/policy.test.ts` | permanent TSN ban |
| Non-null assertions | Type | No | Banned | `validator.ts` | `test/validator/policy.test.ts` | permanent TSN ban |
| `eval` | Effect | No | Banned | `validator.ts` | `test/validator/policy.test.ts` | permanent TSN ban |
| `new Function` | Effect | No | Banned | `validator.ts` | `test/validator/policy.test.ts` | permanent TSN ban |
| `delete` | Effect | No | Banned | `validator.ts` | `test/validator/policy.test.ts` | permanent TSN ban |
| `typeof` runtime checks | Type | No | Banned | `validator.ts` | `test/validator/policy.test.ts` | temporary restriction caused by current implementation |
| `Proxy` / `Reflect` | Effect | No | Banned | `validator.ts` | `test/validator/policy.test.ts` | permanent TSN ban |
| `with` | Type | No | Banned | `validator.ts` | `test/validator/policy.test.ts` | permanent TSN ban |
| Generators / `yield` | Effect | No | Banned | `validator.ts` | `test/validator/policy.test.ts` | temporary ban, Phase 1 target |
| `var` | Type | No | Banned | `validator.ts` | `test/validator/policy.test.ts` | permanent TSN ban |
