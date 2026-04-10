# Test Release Minimum

This file records the minimum bar for a valuable TSN test release.

The goal is not “feature completeness.” The goal is to identify the smallest set of semantics and ergonomics needed for a TypeScript developer to try TSN seriously and get real value out of it.

## What Is Already Valuable Today

The current compiler is already meaningfully useful in these areas:

- arrays and array helpers
- strings and string methods
- object literals and interfaces
- classes and narrow generic classes
- loops and control flow
- JSON parsing in the current supported shape
- file/process-style builtins in the current supported shape
- native UI compilation and conformance harnesses

That means TSN does not need a huge hardening pass before a test release. It already has a real base.

## Minimum Must-Haves Before A Test Release

These are the smallest additional capabilities that make TSN feel like something a normal TypeScript developer can genuinely try, rather than just admire.

### 1. `async/await`

Why it matters:

- normal TS developers expect it immediately for I/O and app code
- it is currently banned in the validator
- without it, the language feels cut off from normal modern TS usage

Release bar:

- basic supported `async` functions
- supported `await` on the TSN runtime promise/task shape
- good diagnostics for unsupported async patterns

#### Async/await v1 discussion

The first TSN async release should feel like TypeScript on the surface, but it should not try to implement the entire JavaScript Promise ecosystem.

What should be supported first:

- `async function`
- `await expr`
- `Promise<T>` as the type returned by `async function`
- error propagation from rejected async operations into `try/catch`
- async hosted I/O for the most important operations
- timer APIs that feel like TypeScript: `setTimeout` and `setInterval`

What should explicitly not be required for v1:

- `new Promise((resolve, reject) => ...)`
- `.then()`, `.catch()`, `.finally()` as the primary programming model
- promise combinators like `Promise.allSettled`, `Promise.race`, `Promise.any`
- top-level `await`
- async iterators
- streaming fetch/body APIs
- cancellation / `AbortController`

The key principle is:

TSN should support TypeScript async syntax first, without taking on the full semantic surface of JavaScript promises in one shot.

#### Runtime model

Hosted TSN async needs a real event loop.

The clean shape is:

- compiler lowers each `async function` into a resumable state machine
- runtime owns promise/task objects
- runtime owns continuation queues
- runtime owns timer, file, network, and process completion callbacks
- `await` suspends the current state machine and registers a continuation
- completion resumes the state machine

This should be built on a hosted event-loop runtime. libuv is the most sensible default for the hosted target because it gives TSN:

- timers
- async file I/O
- process handles
- sockets / networking path
- a real future path for `fetch`-style APIs

#### User-facing API shape

The first async API set should stay small.

Recommended initial hosted async APIs:

- `readFileAsync(path): Promise<string>`
- `writeFileAsync(path, content): Promise<void>`
- `appendFileAsync(path, content): Promise<void>`
- `listDirAsync(path): Promise<string[]>`
- `execAsync(cmd): Promise<number>`
- `fetch(url, options?): Promise<Response>`
- `setTimeout(fn, ms): number`
- `setInterval(fn, ms): number`

Things to avoid:

- adding non-TypeScript primitives like `sleep()` as a language-facing API
- inventing a brand-new async vocabulary when TypeScript developers already know the timer and fetch shapes

If an await-friendly `delay()` helper exists later, it should be stdlib sugar over timers, not a core language primitive.

#### Compiler split for async work

Do not build this as one giant async file.

This area should be split from the beginning, because async will accumulate a large number of edge cases very quickly.

Suggested compiler-side split:

- `async-validator.ts`
- `async-types.ts`
- `async-lowering.ts`
- `async-state-machine.ts`
- `async-builtins.ts`
- `async-timers.ts`
- `async-fetch.ts`

Suggested runtime-side split:

- promise/task runtime
- event-loop integration
- timer runtime
- file I/O adapters
- process adapters
- network/fetch adapters

#### Edge cases that must be designed deliberately

These are the async edge cases that matter immediately:

- locals that live across `await`
- rejection flow into `try/catch`
- already-resolved awaited values
- multiple awaiters on the same promise/task
- `await` inside loops
- cleanup on rejection paths
- UI thread affinity for AppKit-hosted async work
- diagnostics for unsupported async patterns

#### Async/await v1 checklist

- [x] Unban `async` / `await` in the validator behind real support, not optimism
- [x] Decide the exact TSN `Promise<T>` runtime contract
- [x] Decide whether `Promise<T>` is opaque and minimal in v1
- [ ] Specify the exact unsupported Promise features for v1
- [x] Add an async design doc for lowering and runtime behavior
- [x] Split compiler async work into dedicated files instead of one blob
- [ ] Implement compiler lowering of `async function` into state machines
- [ ] Implement `await` suspension and resumption semantics
- [x] Implement runtime promise/task object
- [ ] Implement event-loop integration for hosted async runtime
- [ ] Wire timer support around `setTimeout` / `setInterval`
- [x] Add async file I/O APIs
- [ ] Add `fetch`-style network I/O API
- [ ] Add `try/catch` integration for async rejection flow
- [x] Add module-owned tests for async lowering
- [ ] Add module-owned tests for timer behavior
- [x] Add module-owned tests for file async I/O
- [ ] Add module-owned tests for `fetch`
- [ ] Add explicit validator errors for unsupported async patterns that remain out of scope

#### Async foundation status right now

What is now implemented:

- `Promise<T>` is recognized by the compiler type layer
- promise runtime shapes are emitted into generated C
- `Promise<void>` has a dedicated runtime layout
- hosted async builtins now exist for:
  - `readFileAsync(path): Promise<string>`
  - `writeFileAsync(path, content): Promise<void>`
  - `appendFileAsync(path, content): Promise<void>`
  - `fileExistsAsync(path): Promise<boolean>`
  - `fileSizeAsync(path): Promise<number>`
  - `listDirAsync(path): Promise<string[]>`
  - `execAsync(cmd): Promise<number>`
- the compiler/runtime split is preserved:
  - compiler-side promise typing and hosted async lowering live in dedicated split files
  - runtime async scaffolding and hosted I/O live in dedicated runtime headers instead of expanding `runtime.h` into a second god file
- there is now an integration-style test proving current behavior:
  - the hosted async builtins resolve immediately today because they are wrappers over the existing synchronous hosted runtime

What is now implemented beyond the foundation:

- `async function` now compiles in the current narrow hosted model
- `await` now compiles in the current narrow hosted model
- async functions return `Promise<T>` and wrap final values correctly
- `await` unwraps the current promise carrier immediately
- integration-style tests now prove real end-to-end async function behavior

What is intentionally not implemented yet:

- real suspension / resumption
- continuation queues
- event loop integration
- timer APIs
- `fetch`
- async rejection flow into `try/catch`

So the async situation is:

The foundation is real and working.
The first narrow async language pass is also real and working.

That means TSN now supports user-facing TypeScript async syntax in the synchronous-hosted path, but it does not yet support true event-loop-backed async semantics.

### 2. `try/catch` and `throw`

Why it matters:

- this is standard TypeScript control flow for failure
- it is currently banned in the validator
- without it, normal app-level code feels unnatural very quickly

Release bar:

- basic `throw`
- basic `try/catch`
- clear unsupported edge cases if `finally` is not ready yet

### 3. Better closure support

Why it matters:

- today, arrow callbacks work well in common array helpers
- read-only captures in those helpers work
- general closure semantics are still not real enough

Release bar:

- ordinary read-only captures should work reliably
- common callback usage should not feel special-cased
- the compiler should clearly reject unsupported mutable-capture patterns if they are not ready

### 4. A sane package/module import story

Why it matters:

- normal TS developers expect imports to feel normal
- today, only relative imports are supported
- that makes the language feel more experimental than it needs to

Release bar:

- enough module ergonomics that code organization feels normal
- if full package resolution is not ready, there must be a clear supported story that does not feel broken

## Strong Next Priority After The Minimum

These are not the absolute minimum, but they are the next things that will make the release feel significantly more natural.

### Nullability support

This means:

- `null` / `undefined`
- optional chaining `?.`
- nullish coalescing `??`

Why it matters:

- this is part of ordinary TS thinking
- without it, normal TS code still hits avoidable friction

## Important But Not Release-Blocking For The First Test Release

These can come after the first test release:

- `Map` / `Set`
- inheritance
- static members
- tuples
- enums
- broad union sophistication
- generic functions
- multiple type parameters

These are useful, but they are not the first wall a normal TS developer hits.

## Explicitly Good Enough For A Narrow Test Release

If the test release is clearly positioned as:

- deterministic native TypeScript
- strong for CLI tools, data processing, and native UI experiments
- still growing toward broader TS familiarity

then the current strengths plus the must-haves above are enough to make it valuable.

## Release Gate Summary

Before a meaningful public test release, TSN should have:

1. `async/await`
2. `try/catch` and `throw`
3. closure behavior that is good enough for normal callback-based TS code
4. a sane import/module story

Immediately after that, the next pressure point is:

5. nullability support

Everything else can follow in later releases.
