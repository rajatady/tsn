# Variables & Declarations

### declarations

Use `const` and `let` to declare variables. `var` is banned.

Types can be explicit or inferred from the initializer. When the
compiler can't infer the type, it defaults to `number`.

Array destructuring (`const [a, b] = arr`) compiles to indexed
access into the array's `.data` field. Object destructuring
(`const { name, age } = person`) compiles to field access on
the struct.

**Syntax:**
```typescript
const x: number = 42
let name: string = "Alice"
const [a, b] = arr
const { name, age } = person
```

**Compiles to:**
C variable declarations with the mapped type. Arrays
initialize via TArr_new(). Object literals become C struct initializers.
Destructuring compiles to indexed or field access. Nullable primitives
(number | null) use tagged structs with a has_value flag.

**Limitations:**
- var is banned — use let or const.
- Rest elements in array destructuring (...rest) are not yet supported.
- Renaming in object destructuring ({ name: alias }) is not yet supported.
- Type inference defaults to number when ambiguous — prefer explicit annotations.

**Example:**
```typescript
const count: number = 42
let name: string = "Alice"
const scores: number[] = []

// Array destructuring
const parts = line.split("|")
const [name, dept, salary] = parts

// Object destructuring
const { host, port } = config

// Nullable primitives
const maybeCount: number | null = null
const result: number = maybeCount ?? 0
```

> Since 0.1.0

---
