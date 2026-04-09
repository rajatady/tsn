# TSN → Native Compiler Specification

## Goal
Compile a strict subset of TypeScript directly to C, then to native ARM64 binaries via clang.
Benchmark against Node.js and Bun running the same programs.

## Allowed TypeScript Features
- Primitive types: `number`, `string`, `boolean`
- Typed arrays: `number[]`, `string[]`, `Array<T>`
- Typed objects / interfaces (fixed shape, known at compile time)
- Functions with explicit parameter and return types
- Arrow functions / lambdas (lifted to top-level C functions)
- `const`, `let` (no `var`)
- `if/else`, `for`, `while`, `switch`
- Template literals: `` `hello ${name}` ``
- Destructuring (simple cases)
- String methods: `.length`, `.indexOf()`, `.slice()`, `.split()`, `.trim()`, `.startsWith()`, `.endsWith()`, `.includes()`, `.replace()`
- Array methods: `.push()`, `.pop()`, `.length`, `.map()`, `.filter()`, `.reduce()`, `.sort()`, `.slice()`, `.indexOf()`, `.join()`, `.forEach()`
- `console.log()`
- `JSON.parse()` (returns typed result)
- `Math.*` functions
- Type aliases and interfaces
- Enums (numeric)
- Ternary operator
- Logical operators (`&&`, `||`, `!`)
- Comparison operators
- Arithmetic operators
- String concatenation via `+`

## Banned Features (and why)
| Feature | Why |
|---|---|
| `any`, `unknown` | Can't determine memory layout |
| Type assertions (`as`) | Lies to the compiler about types |
| `eval()`, `new Function()` | Arbitrary code at runtime |
| `obj[computedKey]` (dynamic) | Object shape unknown at compile time |
| `Proxy`, `Reflect` | Runtime metaprogramming |
| Prototype mutation | Object shape changes at runtime |
| `arguments` object | Dynamic arity |
| `with` statement | Dynamic scope |
| `var` | Function-scoped hoisting is hell to compile |
| `delete` operator | Object shape changes at runtime |
| Generators / `yield` | Complex control flow (future work) |
| `async/await` | Requires event loop runtime (future work) |
| Classes with inheritance | Virtual dispatch complexity (future work) |
| Exceptions / `try/catch` | Unwinding is complex (future work) |
| Regex | Requires regex engine (future work) |
| `typeof` at runtime | Type erasure — no runtime type info |
| Optional chaining `?.` | Requires null checks everywhere (future work) |
| Nullish coalescing `??` | Same as above |
| `Symbol` | Runtime-generated unique keys |
| `WeakRef`, `WeakMap` | GC complexity |

## Success Criteria
1. All 3 target programs compile to native binaries without errors
2. All 3 produce byte-identical output to Node.js running the same program
3. Benchmarks print a comparison table: time + memory for Node / Bun / Native
4. Generated C code is human-readable (not obfuscated)

## Target Programs
1. **json-pipeline.ts** — Parse JSON, filter/map/reduce, aggregate, sort, output top results
2. **http-router.ts** — Define routes, match URLs, parse query strings, build responses
3. **markdown-parser.ts** — Parse markdown to HTML (headers, bold, italic, links, code, paragraphs)
