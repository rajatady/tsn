# TSN Inline Documentation Convention

Documentation lives in the source code. The extraction tool (`tools/extract-docs.ts`) pulls it into JSON, the generator (`tools/generate-docs.ts`) produces markdown, the site renders it. Hand-authored docs in `docs/` are transitional and will be replaced as inline docs coverage grows.

**Rule: a feature without inline docs is an incomplete feature.** When you touch a construct — add it, fix it, extend it — add or update its inline docs in the same commit.

## Tag Spec

### Language features (codegen: stmt.ts, expr.ts, classes.ts, etc.)

Every control flow construct, operator, or language-level behavior must carry:

```typescript
/**
 * Brief one-line summary.
 *
 * Optional longer description if the behavior is non-obvious.
 *
 * @page language/control-flow       — docs hierarchy path
 * @section do-while                  — anchor within the page
 * @syntax do { body } while (cond)   — the TS surface the dev writes
 * @compilesTo C do-while with identical structure. Builder detection
 *   and scope cleanup run the same as while loops.
 * @example
 * let i: number = 0
 * do {
 *   i = i + 1
 * } while (i < 10)
 * @limitation Labeled breaks not supported.
 * @since 0.2.0
 */
```

Required: `@page`, `@section`, `@syntax`, `@compilesTo`, `@example`, `@since`
Optional: `@limitation` (one per limitation, can repeat)

### Stdlib functions (@tsn/fs, @tsn/http, builtins)

Every exported function or method:

```typescript
/**
 * Read the entire contents of a file as a string.
 *
 * @page stdlib/fs
 * @section readFile
 * @param path Absolute or relative path to the file
 * @returns The file contents as a UTF-8 string
 * @example
 * const config = readFile("config.json")
 * @complexity O(n) where n is file size
 * @zeroAlloc
 * @since 0.1.0
 */
export declare function readFile(path: string): string
```

Required: `@page`, `@section`, `@param` (all params), `@returns`, `@example`, `@since`
Optional: `@complexity`, `@zeroAlloc`, `@limitation`, `@deprecated`

### Types and interfaces

```typescript
/**
 * An HTTP response returned by fetch().
 *
 * @page stdlib/http
 * @section Response
 * @syntax const res: Response = await fetch(url)
 * @compilesTo TSFetchResponse struct with status, body, headers.
 * @example
 * const res = await fetch("https://api.example.com/data")
 * if (res.ok) {
 *   const body = await res.text()
 * }
 * @since 0.1.0
 */
```

Required: `@page`, `@section`, `@example`, `@since`
Optional: `@syntax`, `@compilesTo`, `@limitation`

### Interface/class members

Properties and methods on interfaces and classes inherit the parent's `@page`. They need:

```typescript
/** HTTP status code (e.g. 200, 404, 500).
 * @section Response.status
 */
status: number
```

Required: `@section` (parent.member format)
The description is the first line. Everything else is inherited from the parent.

## Page hierarchy

```
language/
  control-flow    — if, else, for, for-of, while, do-while, switch, break, continue
  variables       — const, let, type inference, declarations
  types           — number, string, boolean, arrays, nullability, type aliases
  operators       — arithmetic, comparison, logical, bitwise, assignment, ternary, template literals
  functions       — params, return types, closures, arrow callbacks
  classes         — fields, constructors, methods, generics
  interfaces      — structs, object literals
  exceptions      — try/catch/finally, throw
  async           — async/await, promises, timers
  modules         — imports, exports, resolution

stdlib/
  strings         — string methods, concatenation, conversion
  arrays          — array methods, predicates, reductions, iteration
  fs              — sync and async file I/O
  http            — fetch, Response
  console         — console.log
  math            — Math.* methods
  json            — JSON.parse
  timers          — setTimeout, setInterval

runtime/
  memory          — ARC model, Str, arrays, refcounting
  targets         — hosted (libuv), bare-metal (kernel)
```

## Where tags go

- **`/** JSDoc */` on exported declarations** — extracted by the tool. Use for stdlib functions, interfaces, classes, type aliases, exported functions.
- **`/** JSDoc */` on the module/file level** — the first JSDoc in a file becomes the page overview.
- **`/* block comments */` inside function bodies** — NOT extracted. These are for human readability in the code only. Use the `[page :: section]` format for quick scanning.

The extraction tool only reads `/** */` on AST nodes (function declarations, interfaces, classes, methods, properties, type aliases, variable statements). Branch-level constructs inside `emitStmt` can't have TSDoc attached — document those via the module-level JSDoc or by extracting them into their own exported helper functions.

## Pipeline

```bash
# Extract JSON from source
npx tsx tools/extract-docs.ts --stdlib --codegen > docs.json

# Generate markdown from JSON
npx tsx tools/generate-docs.ts < docs.json

# Site reads from docs/generated/ + docs/ (transitional)
cd docs/site && npm run dev
```

## When to add docs

- Adding a new language feature → add `@page`, `@section`, `@syntax`, `@compilesTo`, `@example`, `@since` to the emitter function or the nearest exported declaration
- Adding a new stdlib function → add full TSDoc with all required tags to the declare statement
- Fixing a limitation → update or remove the `@limitation` tag
- Deprecating → add `@deprecated` with migration path
