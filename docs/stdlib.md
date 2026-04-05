# StrictTS Standard Library

Built-in functions and methods available in every StrictTS program.

## String Methods

All string operations are zero-allocation when possible (slices share the source buffer's refcount).

| Method | Signature | Notes |
|--------|-----------|-------|
| `s.slice(start, end?)` | `(number, number?) => string` | Returns substring. Shares source refcount. |
| `s.indexOf(needle)` | `(string) => number` | Returns -1 if not found |
| `s.startsWith(prefix)` | `(string) => boolean` | memcmp-based |
| `s.endsWith(suffix)` | `(string) => boolean` | memcmp-based |
| `s.includes(needle)` | `(string) => boolean` | Linear scan |
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

### String Conversion

```typescript
const s: string = String(42)        // "42"
const s2: string = String(3.14)     // "3.14"
```

## Array Methods

| Method | Signature | Notes |
|--------|-----------|-------|
| `arr.push(element)` | `(T) => void` | Amortized O(1), auto-grows |
| `arr.slice(start, end?)` | `(number, number?) => T[]` | Creates new array (copies elements) |
| `arr.filter(fn)` | `((T) => boolean) => T[]` | Inline loop, new array |
| `arr.sort(fn)` | `((T, T) => number) => T[]` | In-place via C qsort |
| `arr.length` | `number` (property) | Direct field access, O(1) |
| `arr[i]` | `T` | Bounds-checked in debug mode |

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
