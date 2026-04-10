# Profile A Semantics Buckets

This file reorganizes the Phase 1 support matrix into the three semantic buckets that matter for the default TSN language experience:

- memory
- types
- effects

This is still one language, one compiler, one validator, and one user experience. These buckets are not user-visible modes. They are the design lens for deciding what a normal professional TypeScript developer should be able to write without having to think about internals.

## Profile A Contract

Profile A means:

- the code should look like normal TypeScript
- the defaults should feel familiar to a TypeScript developer
- the compiler should reject unsupported or unsafe constructs early
- under-the-hood power should exist, but ordinary users should not need to think about it

The compiler should do the teaching. The developer should not need to reason about native layout, ownership, runtime linkage, or low-level capabilities in everyday code.

## Memory

### What the user should feel

Memory should be mostly invisible in the default experience.

A TypeScript developer writing ordinary TSN code should be able to use:

- strings
- arrays
- object literals
- interfaces
- classes
- JSON-shaped data
- locals and returns

without manually managing allocation or lifetime.

They should not need to learn:

- manual free semantics
- pointer ownership
- explicit borrowing concepts
- low-level region syntax
- raw memory APIs

The language should still have predictable runtime costs, but the compiler and tooling should surface those costs instead of forcing the user to think in systems jargon up front.

### Phase 1 memory-owned features

These Phase 1 rows from the support matrix are primarily memory semantics:

| Feature | Current Status | Notes |
|---|---:|---|
| Closure capture semantics | Partial | Works in narrow callback cases; full closure capture model is still incomplete. |
| `string` | Done | Strong current area. |
| Arrays | Done | Strong current area. |
| Array indexing | Done | Includes checked get/set. |
| `map` / `filter` / `reduce` | Done | Behavior exists; more edge-case coverage still useful. |
| `some` / `every` / `findIndex` / `count` | Done | Good path today. |
| `sort` | Done | Comparator lifting works. |
| `join` / `slice` / `includes` / `indexOf` | Done | Good core support. |
| Numeric reductions `sum` / `min` / `max` | Done | Good core support. |
| Spread / rest | Not done | Missing. |
| String literals / templates / concat | Done | Strong path today. |
| String methods | Done | Strong path today. |

### Memory hardening priorities

The highest-priority memory questions for Profile A are:

1. Class instance lifetime.
   Arrays and strings already have a stronger runtime story than classes. That mismatch should not leak into the default language experience.

2. Closure capture contract.
   The current partial callback behavior is good enough for some helpers, but it still needs to be written down and tested as a real semantic boundary.

3. Copying versus reuse in ordinary fluent code.
   Template strings, concatenation, array helper chains, and future pipe-like patterns need a predictable “does this allocate?” story that tooling can explain.

## Types

### What the user should feel

Types should feel like strict, deterministic TypeScript.

A TS developer should be able to write normal:

- variables
- functions
- interfaces
- classes
- arrays
- object literals
- generics in the supported subset
- booleans, strings, numbers
- destructuring in supported forms

and expect the compiler to either:

- compile it cleanly, or
- explain exactly why it is not supported

They should not have to guess whether syntax “means something different now” unless TSN explicitly documents that difference.

### Phase 1 type-owned features

These Phase 1 rows from the support matrix are primarily type semantics:

| Feature | Current Status | Notes |
|---|---:|---|
| `let` / `const` | Done | Core path. |
| Local type inference | Partial | Usable, still brittle. |
| Function declarations | Done | Core path. |
| Arrow functions in callbacks | Done | Supported in practical cases. |
| `if` / `else` / ternary | Done | Stable. |
| `while` / `for` | Done | Stable. |
| `for...of` on arrays | Done | Stable for arrays. |
| `switch` | Not done | Missing Phase 1 feature. |
| `break` / `continue` | Done | Stable. |
| Interfaces as plain data | Done | Good fit. |
| Classes | Partial | Real support exists, but semantics still need hardening. |
| Constructors / methods / `this` | Partial | Working, but needs a tighter contract. |
| `private` members | Partial | Parsing exists; semantics and enforcement are not complete. |
| Static members | Not done | Later. |
| Inheritance / `extends` / `super` | Not done | Later. |
| Generic classes | Partial | Narrow monomorphization exists. |
| Generic functions | Not done | Missing. |
| Multiple type parameters | Not done | Later. |
| Type aliases | Partial | Needs explicit semantics. |
| Unions | Partial | Not yet a firm contract. |
| Discriminated unions | Partial | Important later Phase 1 target. |
| Tuples | Not done | Missing. |
| Enums | Not done | Later. |
| `number` | Partial | Current reality is “all doubles.” |
| `boolean` | Done | Stable. |
| `null` / `undefined` / optionality | Not done | Missing. |
| Optional chaining `?.` | Not done | Missing. |
| Nullish coalescing `??` | Not done | Missing. |
| Integer-style library types (`i32`, `u64`) | Not done | Important, but not part of current cleanup. |
| Array literals | Partial | Empty/non-empty semantics need explicit coverage. |
| Object literals | Done | Good core support. |
| Object destructuring | Partial | Parameter destructuring works; general local destructuring does not. |
| Array destructuring | Not done | Hook-only special case today. |
| `String.fromCharCode` | Done | Narrow but real. |

### Type hardening priorities

The highest-priority type questions for Profile A are:

1. Class contract.
   This is the biggest active partial. `class`, `constructor`, `this`, fields, methods, and `private` need to feel coherent and teachable.

2. Local type inference.
   The compiler should not force surprising explicitness in otherwise ordinary TS code.

3. Number semantics.
   The “all doubles” reality is acceptable as an implementation fact today, but it should be an explicit semantic contract until integer-style library types land.

4. Destructuring boundary.
   The supported subset should be clear and intentional, not accidental.

5. Alias/union contract.
   These should either be supported with clear rules or banned clearly for now.

## Effects

### What the user should feel

Effects should feel like ordinary app-level TypeScript.

A TS developer should be able to:

- log
- parse JSON
- read and write files
- run process helpers where supported
- eventually use `try/catch`
- eventually use `async/await`

without learning low-level runtime concepts.

The important rule for Profile A is that the user should not have to care which runtime primitive or host detail implements the effect. The compiler and runtime own that complexity.

### Phase 1 effect-owned features

These Phase 1 rows from the support matrix are primarily effect semantics:

| Feature | Current Status | Notes |
|---|---:|---|
| `console.log` | Done | Good path today. |
| `JSON.parse` to typed data | Partial | Useful, but narrower than full expectations. |
| File builtins (`readFile`, `writeFile`, etc.) | Partial | Useful, but still an experimental API shape. |
| Process builtin (`exec`) | Done | Working, but not central to default ergonomics. |
| `try` / `catch` / `finally` | Not done | Important missing Phase 1 feature. |
| `throw` | Not done | Missing. |
| `async` / `await` / `Promise` | Not done | Important missing Phase 1 feature. |
| Bare package imports | Not done | Still not a real package-import story. |

### Effect hardening priorities

The highest-priority effect questions for Profile A are:

1. Error handling.
   `try/catch` and `throw` are normal TS expectations. Their absence is a real Phase 1 gap.

2. Async contract.
   `async/await` should eventually feel like ordinary TS in the default experience, even if the underlying runtime implementation is very different.

3. Hosted API shape.
   File/process/JSON capabilities should feel like coherent TSN APIs rather than scattered ambient helpers.

## Validator Contract For Profile A

The validator should continue to do three jobs:

1. Reject permanent TSN bans.
   Example: `any`, `eval`, fake assertions, `Proxy`, `Reflect`, `var`.

2. Reject not-yet-supported syntax clearly.
   Example: `try/catch`, `async/await`, `switch`, nullability features.

3. Teach the supported subset early.
   Diagnostics should tell a normal TS developer what TSN supports, not just what it hates.

## Immediate Stabilization Order

The next implementation pass should follow this order:

1. Classes
   `class`, constructors, methods, `this`, `private`, generic classes

2. Destructuring and local type inference
   parameter destructuring is already there; general destructuring and inference rules need tightening

3. Type aliases, unions, and number semantics
   write down the real contract before broadening it

4. JSON/file builtins
   keep the default effect surface coherent before adding more features

Only after that should the compiler move into clearly new Phase 1 features:

- `switch`
- `try/catch`
- `throw`
- `async/await`
- nullability / `?.` / `??`
- `Map` / `Set`
- broader generics
