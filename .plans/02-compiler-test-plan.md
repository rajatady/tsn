# Compiler Test Plan

This file is the test strategy for `packages/tsn-compiler-core`. Tests are module-shaped, not guard-shaped. The goal is to freeze existing behavior in the same ownership boundaries that the codegen split will create later.

## Target Test Structure

Target test structure under `packages/tsn-compiler-core/test/`:

- `helpers.ts`
- `validator/policy.test.ts`
- `types/primitives.test.ts`
- `types/interfaces.test.ts`
- `types/aliases.test.ts`
- `types/unions.test.ts`
- `types/nullability.test.ts`
- `types/inference.test.ts`
- `objects/objects.test.ts`
- `objects/destructuring.test.ts`
- `objects/spread-rest.test.ts`
- `strings/strings.test.ts`
- `strings/methods.test.ts`
- `arrays/arrays.test.ts`
- `arrays/indexing.test.ts`
- `arrays/hof.test.ts`
- `arrays/reductions.test.ts`
- `arrays/sort.test.ts`
- `functions/functions.test.ts`
- `functions/callbacks.test.ts`
- `functions/generics.test.ts`
- `classes/classes.test.ts`
- `classes/generics.test.ts`
- `classes/visibility.test.ts`
- `stmt/control-flow.test.ts`
- `stmt/for-of.test.ts`
- `stmt/switch.test.ts`
- `effects/console.test.ts`
- `effects/json.test.ts`
- `effects/fs-builtins.test.ts`
- `effects/process.test.ts`
- `effects/modules.test.ts`
- `effects/exceptions.test.ts`
- `effects/async.test.ts`

## Test Layering Rules

Validator tests assert diagnostics and messages only.

Lowering tests assert generated C fragments only.

There should be no giant golden or snapshot file for whole-program output except where unavoidable.

End-to-end harnesses stay top-level in `harness/` and continue to test compile/run correctness.

## Fast Feedback Loop

Package only:

```bash
npm run test:compiler
```

Package with coverage:

```bash
npm run test:compiler:coverage
```

Full compiler regression later:

```bash
npm run test:unit
```

Full repo regression later:

Use the existing top-level test flow plus harnesses.

## Current State and Immediate Requirement

The current first-pass tests were intentionally thin and must be redistributed into the module-shaped structure above before refactoring starts.

That means the current catch-all compiler test files are only a temporary foothold. The next pass should move that coverage into the long-term folders and expand it so each owned subsystem has a real home, a real failure surface, and real edge-case coverage.
