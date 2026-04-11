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
- it was originally one of the biggest missing modern-TS gaps
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

Hosted TSN async now has a real event-loop-backed foundation.

The current shape is:

- compiler lowers `async function` declarations to `Promise<T>`-returning native functions
- hosted async I/O returns pending promise carriers backed by shared heap state
- runtime schedules file/process work on libuv's worker pool
- `await` blocks the current TSN frame by pumping the hosted libuv loop until the promise settles
- `await` on non-promise values continues immediately with the plain value
- already-settled promises can be awaited repeatedly through shared runtime state
- completion settles the shared promise state and the waiting frame continues

This is no longer just an intermediate placeholder. TSN now has resumable async frame/state-machine lowering in the supported async-function-declaration path, and hosted completions resume suspended frames through shared promise state.

libuv is now the hosted runtime substrate because it gives TSN:

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
- repeated awaits on the same promise/task
- `await` inside loops
- cleanup on rejection paths
- UI thread affinity for AppKit-hosted async work
- diagnostics for unsupported async patterns

#### Async/await v1 checklist

- [x] Unban `async` / `await` in the validator behind real support, not optimism
- [x] Decide the exact TSN `Promise<T>` runtime contract
- [x] Decide whether `Promise<T>` is opaque and minimal in v1
- [x] Specify the exact unsupported Promise features for v1
- [x] Add an async design doc for lowering and runtime behavior
- [x] Split compiler async work into dedicated files instead of one blob
- [x] Implement compiler lowering of `async function` into resumable state machines
- [x] Implement blocking hosted `await` semantics over the runtime event loop
- [x] Implement runtime promise/task object
- [x] Implement event-loop integration for hosted async runtime
- [x] Vendor libuv and add it to the build pipeline
- [x] Wire timer support around `setTimeout` / `setInterval`
- [x] Add async file I/O APIs
- [x] Add `fetch`-style network I/O API
- [x] Add narrow `try/catch` integration for async rejection flow
- [x] Add module-owned tests for async lowering
- [x] Add module-owned tests for timer behavior
- [x] Add module-owned tests for file async I/O
- [x] Add module-owned tests for `fetch`
- [x] Add explicit validator errors for unsupported async patterns that remain out of scope

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
- hosted async I/O is now libuv-backed instead of immediate-resolution wrappers
- vendored libuv is now built as part of the normal TSN toolchain
- the compiler/runtime split is preserved:
  - compiler-side promise typing and hosted async lowering live in dedicated split files
  - runtime async scaffolding and hosted I/O live in dedicated runtime headers instead of expanding `runtime.h` into a second god file
- there is now an integration-style test proving current behavior:
  - async builtins return pending promises before `await`
  - settled hosted async work resumes suspended async functions correctly

What is now implemented beyond the foundation:

- `async function` now compiles in the current narrow hosted model
- `await` now compiles in the current narrow hosted model
- async functions return `Promise<T>` and wrap final values correctly
- async functions now lower into resumable frame/state-machine code
- suspended async frames resume from promise continuations when hosted work settles
- `await` on non-promise values works as an immediate value path
- already-resolved and repeatedly awaited promises work through shared state
- async `main` is awaited by the generated native entrypoint
- `setTimeout`, `setInterval`, `clearTimeout`, and `clearInterval` now work in the hosted libuv runtime
- timer callbacks are supported in the current narrow forms:
  - zero-argument function identifiers
  - zero-argument arrow callbacks with no captures
- `fetch(url)` now works in the hosted runtime
- `fetch(url, { method, body, headers })` now works in the current narrow init shape
- `Response.status`, `Response.statusText`, `Response.ok`, `Response.body`, `response.header(name)`, and `await response.text()` now work
- async file/directory/fetch operations now reject on real OS, libuv, and transport failures instead of silently fabricating success
- promise `.value` misuse now fails loudly instead of drifting into undefined memory reads
- debug and conformance harnesses still pass with hosted async enabled
- integration-style tests now prove real end-to-end async function behavior

What is intentionally not implemented yet:

- richer typed error values beyond the current string-shaped model
- async arrows, async function expressions, and async methods
- `new Promise(...)`

What is intentionally supported but still narrow:

- only async function declarations are supported today
- promise rejection can now be caught through `await` inside `try/catch`
- repeated awaits on the same settled promise work today, and promise continuations now resume suspended async frames
- async I/O now covers file/process/timers/fetch in the narrow hosted model
- timers now work in the hosted runtime, but callback forms are intentionally narrow
- fetch now works in a narrow hosted shape:
  - only `method`, `body`, and `headers` are supported in the init object
  - `Response.statusText`, `response.header(name)`, and `Response.text()` are supported
  - cancellation and streaming are not supported yet
- `finally` now works in the straight-line try/catch path:
  - no `return`, `break`, or `continue` inside try/catch/finally when finally is present
  - no `throw` inside catch/finally when finally is present
- `execAsync` preserves child stderr as plain stderr output and rejects only true launcher/runtime failures

So the async situation is:

The foundation is real and working.
The first narrow async language pass is also real and working.
The first hosted libuv runtime pass is also real and working.
The first narrow exception path is also real and working.

That means TSN now supports user-facing TypeScript async syntax in a real hosted async path, async rejection can be caught, hosted timers are real, hosted `fetch` exists in a narrow useful form, `finally` exists in a narrow useful form, and async suspension/resumption is real. It still does not yet support richer exception semantics or the broader Promise/async surface.

### 2. `try/catch` and `throw`

Why it matters:

- this is standard TypeScript control flow for failure
- without it, normal app-level code feels unnatural very quickly

Release bar:

- basic `throw`
- basic `try/catch`
- a straight-line `finally` path with clear restrictions on unsupported control-transfer corners

Current status:

- basic `throw` now works
- basic `try/catch` now works
- rejected async operations can now be caught through `await`
- `finally` now works in the straight-line try/catch path
- `finally` still rejects `return`/`break`/`continue` in protected blocks and `throw` inside catch/finally
- the error model is still intentionally narrow and string-shaped for now

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
- today, the general package story is still narrow
- that makes the language feel more experimental than it needs to

Release bar:

- enough module ergonomics that code organization feels normal
- if full package resolution is not ready, there must be a clear supported story that does not feel broken

Current status:

- relative imports work
- TSN stdlib imports like `@tsn/fs` and `@tsn/http` work
- general third-party bare imports are still unsupported

## Strong Next Priority After The Minimum

These are not the absolute minimum, but they are the next things that will make the release feel significantly more natural.

### Nullability support

This means:

- `null` / `undefined`
- optional chaining `?.`
- nullish coalescing `??`

Current status:

- narrow nullable unions now work for `string`, arrays, and same-file class references
- narrow `??` now works for that supported nullable subset
- narrow property `?.` now works for nullable class references when the result also stays in the nullable-capable subset
- optional call chaining is still intentionally unsupported
- numeric/boolean nullable unions are still intentionally unsupported

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
5. at least narrow nullability support

Status right now:

- `async/await`: done in the narrow hosted model
- `try/catch` and `throw`: done in the narrow hosted model
- closure behavior: still partial
- import/module story: partial via relative imports plus TSN stdlib imports
- nullability: partial via the narrow supported subset

Everything else can follow in later releases.
