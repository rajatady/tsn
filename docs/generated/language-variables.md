# Variables & Declarations

### declarations

Use `const` and `let` to declare variables. `var` is banned.

Types can be explicit or inferred from the initializer. When the
compiler can't infer the type, it defaults to `number`.

Variables used by functions should have explicit type annotations
to ensure correct codegen.

**Syntax:**
```typescript
const x: number = 42
let name: string = "Alice"
const arr: number[] = []
```

**Compiles to:**
C variable declarations with the mapped type. Arrays
initialize via TArr_new(). Object literals become C struct initializers.
Nullable primitives (number | null) use tagged structs with a has_value flag.

**Limitations:**
- var is banned — use let or const.
- Destructuring declarations are not yet supported.
- Type inference defaults to number when ambiguous — prefer explicit annotations.

**Example:**
```typescript
const count: number = 42
let name: string = "Alice"
const scores: number[] = []
const config: Config = { host: "localhost", port: 8080 }

// Nullable primitives
const maybeCount: number | null = null
const result: number = maybeCount ?? 0
```

> Since 0.1.0

---
