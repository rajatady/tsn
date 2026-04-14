/**
 * JSON.parse — compile-time typed JSON parser.
 *
 * TSN generates a custom JSON parser for the target interface type at
 * compile time. The parser is zero-copy for string fields (borrows
 * from the input buffer) and handles string, number, and boolean fields.
 *
 * @page stdlib/json
 * @section JSON.parse
 * @syntax const data: Person[] = JSON.parse(input)
 * @compilesTo A generated C function `json_parse_Person_array()` that
 * walks the JSON input character by character. String fields are
 * borrowed slices into the input (zero-copy). Unknown fields are skipped.
 * @example
 * interface LogEntry {
 *   level: string
 *   message: string
 *   code: number
 * }
 *
 * const entries: LogEntry[] = JSON.parse(rawJson)
 * for (const entry of entries) {
 *   console.log(entry.level, entry.message)
 * }
 * @limitation Only parses typed arrays of a known interface: T[] = JSON.parse(s).
 * @limitation No nested objects or arrays inside the parsed type.
 * @limitation No generic JSON.parse to a dynamic type.
 * @since 0.1.0
 */
export const JSON_PARSE_DOC = true

/**
 * JSON.stringify — serialize values to JSON strings.
 *
 * Supports primitive types (number, string, boolean) and interfaces
 * (structs). For interfaces, the compiler generates a type-specific
 * serializer that emits each field with the correct JSON formatting.
 *
 * @page stdlib/json
 * @section JSON.stringify
 * @syntax JSON.stringify(42) | JSON.stringify("hello") | JSON.stringify(person)
 * @compilesTo Primitive types call runtime helpers: json_stringify_num,
 * json_stringify_str, json_stringify_bool. Struct types generate a
 * custom serializer that builds the JSON string field by field via StrBuf.
 * @example
 * console.log(JSON.stringify(42))          // "42"
 * console.log(JSON.stringify("hello"))     // "\"hello\""
 * console.log(JSON.stringify(true))        // "true"
 * @example
 * interface Person { name: string; age: number; active: boolean }
 * const p: Person = { name: "Alice", age: 30, active: true }
 * console.log(JSON.stringify(p))
 * // {"name":"Alice","age":30,"active":true}
 * @limitation No array serialization yet.
 * @limitation No nested object serialization.
 * @limitation No pretty-printing (indent parameter).
 * @since 0.2.0
 */
export const JSON_STRINGIFY_DOC = true
