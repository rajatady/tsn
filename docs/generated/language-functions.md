# Functions

### default-parameters

Functions support typed parameters, return types, and default values.

Default parameters are filled in at the call site — the C function
always receives all arguments. When the caller omits a trailing
argument that has a default, the compiler inserts the default
value automatically.

**Syntax:**
```typescript
function greet(name: string = "world"): void
```

**Compiles to:**
The function signature includes all parameters. Defaults
are stored on the FuncSig and emitted at call sites where arguments
are omitted: greet() → greet(str_lit("world")).

**Limitations:**
- Default values must be literals or simple expressions.

**Examples:**
```typescript
function greet(name: string = "world"): void {
  console.log("Hello " + name)
}

greet()        // prints "Hello world"
greet("Alice") // prints "Hello Alice"
```
```typescript
function format(value: number, prefix: string = "$", suffix: string = ""): string {
  return prefix + String(value) + suffix
}
```

> Since 0.2.0

---
