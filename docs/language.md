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
```

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
| Non-null assertions (`!`) | No nullable types |
| `eval()` | No runtime code generation |
| `new Function()` | No runtime code generation |
| `delete` | Objects cannot change shape |
| `typeof` | No runtime type info in native code |
| `var` | Use `let` or `const` |
| `Proxy` / `Reflect` | No metaprogramming |
| `with` | Dynamic scoping |
| Generators / `yield` | Future work |
| Bare imports (`'lodash'`) | Only relative imports (`./path`), TSN stdlib (`@tsn/fs`), and native TSN packages are supported |

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
- Relative imports (`./path`, `../path`) — resolution tries: `.ts`, `.tsx`, `/index.ts`, `/index.tsx`
- TSN stdlib imports (`@tsn/fs`, `@tsn/http`)
- Native TSN packages from `node_modules` (see [Native FFI Packages](#native-ffi-packages) below)
- Circular imports are detected and rejected with a clear error
- `export` keyword is stripped — C has a flat namespace, everything is visible
- Re-exports work: `export { X } from './other'`

### Native FFI Packages

TSN supports importing native packages that ship C source files alongside TypeScript type declarations. This is the FFI boundary — it lets package authors provide native functionality without modifying the compiler.

#### Package author side

```
tsn-datetime/
  package.json
  src/
    index.ts          # TS surface (types + declare function)
    datetime.c        # native C implementation
```

**package.json:**
```json
{
  "name": "tsn-datetime",
  "version": "0.1.0",
  "tsn": {
    "entry": "src/index.ts",
    "native": ["src/datetime.c"]
  }
}
```

**src/index.ts** — TypeScript declarations for the C functions:
```typescript
export declare function _dt_now(): number
export declare function _dt_format(ts: number): string
```

**src/datetime.c** — C implementations (can `#include "runtime.h"` for `Str`):
```c
#include <time.h>
#include "runtime.h"

double _dt_now(void) {
    return (double)time(NULL);
}

Str _dt_format(double ts) {
    time_t t = (time_t)ts;
    struct tm *tm = localtime(&t);
    char buf[32];
    int len = snprintf(buf, sizeof(buf), "%04d-%02d-%02d", 
        tm->tm_year + 1900, tm->tm_mon + 1, tm->tm_mday);
    return str_from(buf, len);
}
```

#### Consumer side

```bash
npm install tsn-datetime
```

```typescript
import { _dt_now, _dt_format } from "tsn-datetime"

function main(): void {
  const now = _dt_now()
  console.log("Today: " + _dt_format(now))
}
```

```bash
tsn build app.ts
```

The compiler reads `tsn-datetime` from `node_modules`, pulls in `index.ts` for type checking and codegen, and passes `datetime.c` to the linker. One binary. No runtime.

#### Local native files

For project-level native C files (not in a package), create `tsn.config.json` in the project root:

```json
{
  "native": ["src/mylib.c"]
}
```

The compiler will link these files into the binary. Use `declare function` in your TypeScript to declare the C functions.

#### Alternatively: `tsn.config.json` in the package

Instead of the `"tsn"` field in `package.json`, packages can ship a standalone `tsn.config.json`:

```json
{
  "entry": "src/index.ts",
  "native": ["src/datetime.c"]
}
```

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
