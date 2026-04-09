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
| Classes | Use interfaces + functions |
| `async` / `await` | Future work |
| `try` / `catch` | Future work |
| Generators / `yield` | Future work |
| Bare imports (`'lodash'`) | Only relative imports (`./path`) supported |

## Idioms

### No closures — use parameters

```typescript
// BAD: closure captures variable
// const handler = () => { doSomething(capturedVar) }

// GOOD: pass data via function parameters
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
- Only relative imports (`./path`, `../path`) — bare imports like `'lodash'` are rejected
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
