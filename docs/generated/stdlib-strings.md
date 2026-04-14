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

### regex

Regex support via POSIX `<regex.h>`.

TSN provides basic regex matching through `string.match()` and
`string.search()`. Patterns are POSIX Extended Regular Expressions
(ERE), passed as plain strings — not `/pattern/` literals.

**Syntax:**
```typescript
s.match("[0-9]+")
s.search("[a-z]+")
```

**Returns:** `unknown`

**Compiles to:**
POSIX regcomp/regexec. The pattern string is compiled
at each call (no caching). match() returns a Str slice of the
first match (nullable — .data is NULL on no match). search()
returns the index of the first match or -1.

**Limitations:**
- Patterns are POSIX ERE, not JavaScript regex. No /flags/.
- No global matching (matchAll). Only first match returned.
- Pattern is recompiled on every call — no regex caching.
- No capture groups — match() returns the full match only.

**Examples:**
```typescript
const log = "error: code 404 at line 72"
const code = log.match("[0-9]+") ?? "none"  // "404"
const idx = log.search("[0-9]+")             // 12
```
```typescript
// Check if a string contains a pattern
const hasDigits = s.search("[0-9]") >= 0
```

> Since 0.2.0

---
