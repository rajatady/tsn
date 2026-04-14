# JSON

### JSON.parse

JSON.parse — compile-time typed JSON parser.

TSN generates a custom JSON parser for the target interface type at
compile time. The parser is zero-copy for string fields (borrows
from the input buffer) and handles string, number, and boolean fields.

**Syntax:**
```typescript
const data: Person[] = JSON.parse(input)
```

**Returns:** `unknown`

**Compiles to:**
A generated C function `json_parse_Person_array()` that
walks the JSON input character by character. String fields are
borrowed slices into the input (zero-copy). Unknown fields are skipped.

**Limitations:**
- Only parses typed arrays of a known interface: T[] = JSON.parse(s).
- No nested objects or arrays inside the parsed type.
- No generic JSON.parse to a dynamic type.

**Example:**
```typescript
interface LogEntry {
  level: string
  message: string
  code: number
}

const entries: LogEntry[] = JSON.parse(rawJson)
for (const entry of entries) {
  console.log(entry.level, entry.message)
}
```

> Since 0.1.0

---

### JSON.stringify

JSON.stringify — serialize values to JSON strings.

Supports primitive types (number, string, boolean) and interfaces
(structs). For interfaces, the compiler generates a type-specific
serializer that emits each field with the correct JSON formatting.

**Syntax:**
```typescript
JSON.stringify(42)
JSON.stringify("hello")
JSON.stringify(person)
```

**Returns:** `unknown`

**Compiles to:**
Primitive types call runtime helpers: json_stringify_num,
json_stringify_str, json_stringify_bool. Struct types generate a
custom serializer that builds the JSON string field by field via StrBuf.

**Limitations:**
- No array serialization yet.
- No nested object serialization.
- No pretty-printing (indent parameter).

**Examples:**
```typescript
console.log(JSON.stringify(42))          // "42"
console.log(JSON.stringify("hello"))     // "\"hello\""
console.log(JSON.stringify(true))        // "true"
```
```typescript
interface Person { name: string; age: number; active: boolean }
const p: Person = { name: "Alice", age: 30, active: true }
console.log(JSON.stringify(p))
// {"name":"Alice","age":30,"active":true}
```

> Since 0.2.0

---
