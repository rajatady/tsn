# TSN Language Reference

TSN is a strict subset of TypeScript that compiles to native code. If your code passes the validator, it will compile to a native binary.

## Type System

Every value has a known type at compile time. No `any`, no `unknown`, no type assertions.

| TypeScript | C Type | Size | Notes |
|-----------|--------|------|-------|
| `number` | `double` | 8 bytes | All numbers are 64-bit floats |
| `string` | `Str` | 24 bytes | Value type with optional refcount |
| `boolean` | `bool` | 1 byte | `true` / `false` |
| `JSX.Element` | `UIHandle` | pointer-sized | Native view/window handle returned by TSX components |
| `void` | `void` | 0 | Return type only |
| `T[]` | `TArr` | 12 bytes | Refcounted dynamic array |
| `interface T` | `struct T` | Sum of fields | Passed by value |
| `Promise<T>` | `Promise_*` | runtime struct | Narrow hosted async carrier |

### Array Type Names

- `string[]` compiles to `StrArr`
- `number[]` compiles to `DoubleArr`
- `boolean[]` compiles to `BoolArr`
- `Employee[]` compiles to `EmployeeArr`

## What's Allowed

### Variable Declarations

```typescript
const x = 42                    // number (inferred)
let name: string = "Alice"      // string (annotated)
const arr: number[] = []        // typed array
```

Use `const` or `let`. `var` is banned.

**Important:** Variables used by functions must have explicit type annotations. The compiler defaults to `double` when it can't infer the type.

### Functions

```typescript
function add(a: number, b: number): number {
  return a + b
}

function greet(name: string): string {
  return "Hello, " + name
}
```

All parameters should have type annotations. Return type is inferred but recommended.

Arrays and structs are passed by value. If a helper may grow an array with
`push()`, return the updated array and reassign it at the callsite instead of
assuming the callee can update the caller's array header in place.

### Async Functions

```typescript
import { writeFileAsync, readFileAsync } from "@tsn/fs"

async function load(path: string): Promise<string> {
  await writeFileAsync(path, "hello")
  return await readFileAsync(path)
}
```

TSN now supports a narrow async/await model for hosted code:

- `async function` declarations are supported
- `await` is supported inside async functions
- async functions return `Promise<T>`
- `await` on plain values works as an immediate value path
- already-settled promises can be awaited repeatedly
- hosted async file/process APIs are supported
- hosted timer APIs are supported through `setTimeout` / `setInterval`
- hosted `fetch` is supported in a narrow form
- hosted async I/O is backed by the TSN hosted runtime on top of libuv
- promise misuse is guarded at runtime:
  - reading `.value` from a pending or rejected promise is a runtime error
  - promise payload mismatches fail loudly instead of becoming undefined memory reads

Current limitation:

- async functions now lower through resumable frame/state-machine code
- top-level waiting still blocks the native entrypoint while the hosted loop drives pending work
- timer callbacks are intentionally narrow today:
  - function identifiers must be zero-argument callbacks
  - arrow callbacks must be zero-argument and capture-free
- `fetch` currently supports only:
  - `fetch(url)`
  - `fetch(url, { method, body, headers })`
  - `Response.status`, `Response.statusText`, `Response.ok`, `Response.body`, `response.header(name)`, and `await response.text()`
- hosted async file/fetch operations reject on real OS or transport failures:
  - missing files and directories reject instead of silently fabricating values
  - invalid fetch transports reject and can be caught through `try/catch`
- headers, cancellation, streaming response bodies, `new Promise(...)`, async arrows, and async methods are not supported yet

### Exceptions

```typescript
function main(): void {
  try {
    throw "boom"
  } catch (err) {
    console.log(err)
  }
}
```

TSN now supports a narrow exception model:

- `throw` is supported
- `try/catch` is supported
- `finally` is supported in straight-line try/catch flows
- async rejection can be caught through `await`

Current limitation:

- `finally` currently does not support control-transfer statements in protected blocks:
  - no `return`, `break`, or `continue` inside try/catch/finally when finally is present
  - no `throw` inside catch/finally when finally is present
- thrown values are intentionally narrow today; string-shaped errors are the supported path

### Interfaces (Structs)

```typescript
interface Employee {
  name: string
  department: string
  salary: number
  active: boolean
}

const emp: Employee = {
  name: "Alice",
  department: "Engineering",
  salary: 120000,
  active: true
}
```

Interfaces compile to C structs. They're passed by value. Only data fields are supported (no methods).

### Classes

```typescript
class Counter {
  value: number

  constructor(initial: number) {
    this.value = initial
  }

  inc(): void {
    this.value = this.value + 1
  }
}
```

Classes are supported as reference-like objects with constructors, fields, methods, `this`, and narrow generic-class support. Inheritance, async methods, and a complete visibility model are not fully supported yet.

### Control Flow

```typescript
// If/else
if (x > 10) {
  console.log("big")
} else if (x > 5) {
  console.log("medium")
} else {
  console.log("small")
}

// While loop
let i = 0
while (i < arr.length) {
  console.log(String(arr[i]))
  i = i + 1
}

// For loop
for (let i = 0; i < 10; i++) {
  console.log(String(i))
}

switch (status) {
  case 200:
    console.log("ok")
    break
  default:
    console.log("other")
}
```

### Nullability

```typescript
class User {
  name: string

  constructor(name: string) {
    this.name = name
  }
}

function label(user: User | null): string {
  return user?.name ?? "anonymous"
}
```

TSN now supports a narrow nullability model:

- `string | null` and `string | undefined`
- `T[] | null` and `T[] | undefined`
- same-file class references like `User | null`
- nullish coalescing `??`
- narrow property optional chaining `?.` on nullable class references

Current limitation:

- numeric and boolean nullable unions are not supported yet
- optional call chaining like `obj?.method()` is not supported yet
- optional chaining currently stays in the supported nullable-capable subset

### Operators

| Category | Operators |
|----------|----------|
| Arithmetic | `+`, `-`, `*`, `/`, `%` |
| Comparison | `<`, `<=`, `>`, `>=`, `===`, `!==` |
| Logical | `&&`, `\|\|`, `!` |
| Bitwise | `&`, `\|`, `^`, `<<`, `>>` |
| Assignment | `=`, `+=`, `-=` |
| Unary | `-`, `+`, `!` |
| Ternary | `condition ? a : b` |

String `+` triggers concatenation (uses stack-allocated StrBuf, zero heap alloc for small strings).

String `===` / `!==` uses `str_eq()` (memcmp-based, not pointer compare).

### Template Literals

```typescript
const msg = `Hello, ${name}! You have ${count} items.`
```

Compiles to StrBuf append chain. Zero-alloc for stack-sized results.

### String Conversion

```typescript
const s: string = String(42)      // "42"
const s2: string = String(3.14)   // "3.14"
```

Whitespace trimming is also supported:

```typescript
const clean = raw.trim()
const left = raw.trimStart()
const right = raw.trimEnd()
```

## What's Banned

These features are rejected at validation time with clear error messages:

| Feature | Why |
|---------|-----|
| `any` / `unknown` types | Every value must have a known type |
| Type assertions (`as`) | They lie to the compiler |
| Non-null assertions (`!`) | TSN supports only a narrow nullable subset and does not allow assertion-based escape hatches |
| `eval()` | No runtime code generation |
| `new Function()` | No runtime code generation |
| `delete` | Objects cannot change shape |
| `typeof` | No runtime type info in native code |
| `var` | Use `let` or `const` |
| `Proxy` / `Reflect` | No metaprogramming |
| `with` | Dynamic scoping |
| Generators / `yield` | Future work |
| Bare imports (`'lodash'`) | Only relative imports (`./path`) and TSN stdlib imports (`@tsn/fs`, `@tsn/http`) are supported |

Additional async restrictions for now:

- `new Promise(...)`
- async arrow functions
- async function expressions
- async class/object methods

## Idioms

### General closures are still limited

```typescript
// Still not generally supported:
// const handler = () => { doSomething(capturedVar) }

// Good default: pass data via function parameters
function onDeptClick(tag: number): void {
  deptFilterIdx = tag
  applyFilters()
}
```

### No array literals in function calls — build separately

```typescript
// BAD: struct literal in push
// result.push({ name: "Alice", salary: 120000 })

// GOOD: build separately
const emp: Employee = makeEmployee(seed)
result.push(emp)
```

### Lookup functions instead of array literals

```typescript
// Can't do: const names = ["Alice", "Bob", "Charlie"]
// Instead:
function firstName(i: number): string {
  if (i === 0) return "Alice"
  if (i === 1) return "Bob"
  if (i === 2) return "Charlie"
  return "Unknown"
}
```

### Imports

Standard TypeScript relative imports. All imported files are merged into a single C output at compile time — no runtime module system.

```typescript
// lib/types.ts
export interface Employee {
  name: string
  salary: number
}

// lib/search.ts
import { Employee } from './types'

export function findEmployee(name: string, list: Employee[]): Employee {
  // ...
}

// app.tsx
import { Employee } from './lib/types'
import { findEmployee } from './lib/search'
```

**Rules:**
- Relative imports (`./path`, `../path`) are supported
- TSN stdlib imports like `@tsn/fs` and `@tsn/http` are supported
- General bare imports like `'lodash'` are still rejected
- Resolution tries: `.ts`, `.tsx`, `/index.ts`, `/index.tsx`
- Circular imports are detected and rejected with a clear error
- `export` keyword is stripped — C has a flat namespace, everything is visible
- Re-exports work: `export { X } from './other'`

### Semicolons before JSX

```typescript
initFilters();  // <- semicolon required before top-level JSX

<Window title="App" width={800} height={600} dark>
  ...
</Window>
```

Without the semicolon, the parser interprets `<` as a less-than operator.

### `declare function` for compiler-generated functions

```typescript
// refreshTable is auto-generated by the JSX compiler when <Table> has cellFn
declare function refreshTable(rows: number): void

function onSearch(text: string): void {
  searchText = text
  applyFilters()
  refreshTable(filteredCount)
}
```
