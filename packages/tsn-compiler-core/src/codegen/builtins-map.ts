/**
 * Map<K, V> — hash map with primitive keys.
 *
 * An open-addressing hash table with linear probing. Keys must be
 * primitive types (string, number, boolean). Values can be any TSN type.
 *
 * The map is value-typed — passed by value on the stack, mutated via
 * pointer (&m). Data is heap-allocated and not refcounted (call
 * release manually if needed).
 *
 * @page stdlib/collections
 * @section Map
 * @syntax const m = new Map<string, number>()
 * @compilesTo DEFINE_MAP macro generates a typed struct with parallel
 * arrays for keys, values, and occupancy flags. Uses FNV-1a hash for
 * strings, bit-cast hash for numbers. Grows at 75% load factor.
 * Backward-shift deletion (no tombstones).
 * @example
 * const counts = new Map<string, number>()
 * counts.set("errors", 5)
 * counts.set("warnings", 12)
 *
 * if (counts.has("errors")) {
 *   const n = counts.get("errors") ?? 0
 *   console.log("Error count:", n)
 * }
 *
 * counts.delete("warnings")
 * console.log("Size:", counts.size)
 * @example
 * // String keys, string values
 * const headers = new Map<string, string>()
 * headers.set("Content-Type", "application/json")
 * const ct = headers.get("Content-Type") ?? "unknown"
 * @example
 * // Number keys
 * const names = new Map<number, string>()
 * names.set(200, "OK")
 * names.set(404, "Not Found")
 * @limitation Keys must be primitive types (string, number, boolean). No object/interface keys.
 * @limitation for-of iteration over Map entries is not yet supported.
 * @limitation Map constructor with initial entries is not supported — use set() calls.
 * @limitation get() returns a nullable value — use ?? to provide a fallback.
 * @since 0.2.0
 */
export const MAP_DOC = true

/**
 * Set<T> — hash set with primitive elements.
 *
 * A wrapper around Map where the value is a dummy boolean.
 * Elements must be primitive types (string, number, boolean).
 * Duplicate additions are no-ops.
 *
 * @page stdlib/collections
 * @section Set
 * @syntax const s = new Set<string>()
 * @compilesTo DEFINE_SET macro wraps DEFINE_MAP with a bool dummy value.
 * Same hash table implementation as Map.
 * @example
 * const seen = new Set<string>()
 * seen.add("alice")
 * seen.add("bob")
 * seen.add("alice")  // no-op, already present
 *
 * console.log(seen.has("alice"))  // true
 * console.log(seen.size)          // 2
 *
 * seen.delete("bob")
 * console.log(seen.size)          // 1
 * @limitation Elements must be primitive types. No object/interface elements.
 * @limitation for-of iteration over Set values is not yet supported.
 * @since 0.2.0
 */
export const SET_DOC = true
