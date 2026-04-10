# TSN Standard Library

Built-in functions and methods available in every TSN program.

## String Methods

All string operations are zero-allocation when possible (slices share the source buffer's refcount).

| Method | Signature | Notes |
|--------|-----------|-------|
| `s.slice(start, end?)` | `(number, number?) => string` | Returns substring. Shares source refcount. |
| `s.indexOf(needle, fromIndex?)` | `(string, number?) => number` | Returns -1 if not found |
| `s.startsWith(prefix)` | `(string) => boolean` | memcmp-based |
| `s.endsWith(suffix)` | `(string) => boolean` | memcmp-based |
| `s.includes(needle)` | `(string) => boolean` | Linear scan |
| `s.split(sep)` | `(string) => string[]` | Splits into `StrArr` slices |
| `s.trim()` | `() => string` | Zero-copy slice when trimming whitespace |
| `s.trimStart()` | `() => string` | Trims leading ASCII whitespace |
| `s.trimEnd()` | `() => string` | Trims trailing ASCII whitespace |
| `s.toLowerCase()` | `() => string` | ASCII lowercasing |
| `s.toUpperCase()` | `() => string` | ASCII uppercasing |
| `s.length` | `number` (property) | Direct field access, O(1) |

### String Concatenation

```typescript
const full = first + " " + last    // StrBuf on stack, zero heap alloc for < 256 bytes
```

Concat chains are flattened: `a + b + c + d` becomes a single StrBuf with 4 appends (no intermediate strings).

### Char Comparison Optimization

```typescript
if (s.slice(i, i + 1) === "x")     // optimized to: str_at(s, i) == 'x'
```

Single-character comparisons are automatically optimized to direct char access.

### Split

```typescript
const fields = line.split("|")
const lines = input.split("\n")
```

`split()` returns `string[]` and reuses string slices where possible. Empty
separators split into single-character strings.

### String Conversion

```typescript
const s: string = String(42)        // "42"
const s2: string = String(3.14)     // "3.14"
```

### Number Parsing

```typescript
const amount = parseFloat("143220.75")
const count = parseInt("502")
```

`parseFloat()` parses decimal strings. `parseInt()` parses then truncates toward
zero. For invalid input, both return `0`.

## Array Methods

| Method | Signature | Notes |
|--------|-----------|-------|
| `arr.push(element)` | `(T) => void` | Amortized O(1), auto-grows |
| `arr.slice(start, end?)` | `(number, number?) => T[]` | Creates new array (copies elements) |
| `arr.filter(fn)` | `((T) => boolean) => T[]` | Inline loop, new array |
| `arr.sort(fn)` | `((T, T) => number) => T[]` | In-place via C qsort |
| `arr.indexOf(value)` | `(T) => number` | Inline scan, string-aware equality |
| `arr.includes(value)` | `(T) => boolean` | Inline scan, early exit |
| `arr.findIndex(fn)` | `((T) => boolean) => number` | Inline scan with early exit |
| `arr.some(fn)` | `((T) => boolean) => boolean` | Stops at first match |
| `arr.every(fn)` | `((T) => boolean) => boolean` | Stops at first failure |
| `arr.count(fn)` | `((T) => boolean) => number` | Counts matching elements |
| `nums.sum()` | `() => number` | `number[]` only |
| `nums.min()` | `() => number` | `number[]` only, `0` if empty |
| `nums.max()` | `() => number` | `number[]` only, `0` if empty |
| `arr.join(sep?)` | `(?string) => string` | Stack `StrBuf`, heap finalization |
| `arr.length` | `number` (property) | Direct field access, O(1) |
| `arr[i]` | `T` | Bounds-checked in debug mode |

Because array headers are passed by value, helpers that call `push()` should
return the updated array and let the caller rebind it.

### Predicate Queries

```typescript
const hasErrors = logs.some(log => log.status >= 500)
const allHealthy = services.every(name => serviceErrorCount(logs, name) === 0)
const firstSlow = logs.findIndex(log => log.latencyMs >= 900)
const breaches = logs.count(log => log.status >= 500)
```

### Numeric Reductions

```typescript
const total = revenues.sum()
const highest = revenues.max()
const lowest = costs.min()
```

### Filter

```typescript
const active = employees.filter(e => e.status === "Active")
```

Generates an inline for-loop with push per matching element.

### Sort

```typescript
const sorted = scores.sort((a, b) => b - a)  // descending
```

Lifts the comparator to a top-level C function, calls `qsort()`.

### Join

```typescript
const line = names.join(", ")
```

For `string[]`, `number[]`, and `boolean[]`, this lowers to a single stack `StrBuf`
append loop with one heap allocation for the final result.

## console.log

```typescript
console.log("Count:", count, "Name:", name)
```

Compiles to direct stdout writes. **Zero string allocation** — each argument is printed individually.

Generated C:
```c
({ print_str(str_lit("Count:")); print_num(count); print_str(str_lit("Name:")); print_str(name); print_nl(); })
```

String concatenation inside console.log is also flattened:
```typescript
console.log("Total: " + String(count) + " items")
// prints 3 pieces directly, no intermediate string
```

## Hosted File and Process Builtins

The current hosted builtins are available without imports:

```typescript
declare function readFile(path: string): string
declare function writeFile(path: string, content: string): void
declare function appendFile(path: string, content: string): void
declare function fileExists(path: string): boolean
declare function fileSize(path: string): number
declare function listDir(path: string): string[]
declare function exec(cmd: string): number
```

The current hosted async forms are:

```typescript
declare function readFileAsync(path: string): Promise<string>
declare function writeFileAsync(path: string, content: string): Promise<void>
declare function appendFileAsync(path: string, content: string): Promise<void>
declare function fileExistsAsync(path: string): Promise<boolean>
declare function fileSizeAsync(path: string): Promise<number>
declare function listDirAsync(path: string): Promise<string[]>
declare function execAsync(cmd: string): Promise<number>
```

Important limitation:

- the async forms now return pending promises backed by the hosted libuv runtime
- `await` drives them to completion by pumping the hosted event loop
- they are real hosted async I/O, but not yet resumable state-machine async
- timers and `fetch` are still not available yet

## Math

| Method | Signature |
|--------|-----------|
| `Math.floor(x)` | `(number) => number` |
| `Math.round(x)` | `(number) => number` |

All `Math.*` calls compile to `ts_math_*(args)`.

## JSON.parse

```typescript
interface Person {
  name: string
  age: number
  active: boolean
}

const data: Person[] = JSON.parse(inputStr)
```

The compiler generates a custom parser for the target interface type. Features:
- Zero-copy string fields (borrow from input buffer)
- Supports `string`, `number`, `boolean` fields
- Skips unknown fields
- Returns typed array

## stdin

```typescript
function main(): void {
  const input: string = readStdin()
  // or: fs.readFileSync(path, 'utf-8') is also mapped to stdin
}
```

Reads entire stdin into a heap-allocated string.
