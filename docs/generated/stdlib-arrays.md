# Array Methods

### overview

Array methods available on every `T[]` value in TSN.

Transformation methods (map, filter, sort, reverse) return new arrays.
Mutation methods (push, pop) modify in place. Predicate methods (some,
every, findIndex, count) scan with early exit. Numeric reductions
(sum, min, max) work on number[] only.

**Syntax:**
```typescript
arr.push(item)
arr.pop()
arr.filter(fn)
arr.map(fn)
arr.sort(fn)
arr.reverse()
arr.join(",")
arr.includes(x)
```

**Signature:**
```typescript
function emitArrayMethod(ctx: BuiltinEmitterContext, objExpr: string, objType: string, method: string, args: ts.NodeArray<ts.Expression>): string | null
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `objExpr` | `string` |  |
| `objType` | `string` |  |
| `method` | `string` |  |

**Returns:** `string | null`

**Compiles to:**
Inline C loops for most methods. sort uses qsort with a
lifted comparator. push/pop modify the array header in place. reverse
creates a new array. Predicate callbacks are inlined at the call site.

**Limitations:**
- Callbacks must be arrow functions (not function identifiers).
- No flat(), concat(), or splice().

**Example:**
```typescript
const nums: number[] = []
nums.push(3)
nums.push(1)
nums.push(2)
const sorted = nums.sort((a: number, b: number): number => a - b)
const doubled = nums.map((n: number): number => n * 2)
const last = nums.pop()
const rev = nums.reverse()
```

> Since 0.1.0

---
