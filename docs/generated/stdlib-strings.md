# String Methods

### overview

String methods available on every `string` value in TSN.

All methods compile to direct C function calls on the Str type.
Most string operations are zero-allocation — slices share the
source buffer's refcount. Methods that produce new strings
(replace, replaceAll, repeat, toLowerCase, toUpperCase) allocate
a heap-backed refcounted buffer.

**Syntax:**
```typescript
s.slice(0, 5)
s.indexOf("x")
s.includes("y")
s.split(",")
s.trim()
s.replace("a", "b")
s.repeat(3)
```

**Signature:**
```typescript
function emitStringMethod(ctx: BuiltinEmitterContext, objExpr: string, method: string, args: ts.NodeArray<ts.Expression>): string | null
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `objExpr` | `string` |  |
| `method` | `string` |  |

**Returns:** `string | null`

**Compiles to:**
Direct C calls: str_slice, str_indexOf, str_includes,
str_split, str_trim, str_replace, str_repeat, etc. Zero-copy where
possible (slices share source refcount), heap alloc for transforms.

**Example:**
```typescript
const name = "  Alice Smith  ".trim()
const parts = name.split(" ")
const lower = name.toLowerCase()
const replaced = name.replace("Alice", "Bob")
const stars = "*".repeat(10)
```

> Since 0.1.0

---
