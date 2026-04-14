/**
 * Math object — standard mathematical functions and constants.
 *
 * All `Math.*` calls compile directly to C `<math.h>` functions via
 * `ts_math_*()` wrappers. Constants like `Math.PI` compile to C macros.
 * No runtime overhead — these are all inlined by the C compiler.
 *
 * @page stdlib/math
 * @section overview
 * @syntax Math.floor(x) | Math.ceil(x) | Math.abs(x) | Math.pow(x, y) | Math.sqrt(x) | Math.min(a, b) | Math.max(a, b) | Math.random()
 * @compilesTo Direct C math.h calls: floor(), ceil(), fabs(), pow(), sqrt(),
 * sin(), cos(), tan(), exp(), log(). Math.random() uses rand()/RAND_MAX.
 * Math.PI and Math.E are compile-time constants.
 * @example
 * const area = Math.PI * Math.pow(radius, 2)
 * const clamped = Math.max(0, Math.min(value, 100))
 * const root = Math.sqrt(144)
 * const angle = Math.sin(Math.PI / 4)
 * const r = Math.random()
 * @example
 * // Available methods:
 * // Math.floor, Math.ceil, Math.round, Math.abs
 * // Math.pow, Math.sqrt, Math.min, Math.max
 * // Math.sin, Math.cos, Math.tan, Math.exp, Math.log
 * // Math.random
 * // Constants: Math.PI, Math.E
 * @limitation Math.random() is seeded by the C runtime — not cryptographically secure.
 * @limitation No Math.atan2, Math.sign, Math.trunc, Math.cbrt yet.
 * @since 0.1.0
 */
export const MATH_DOC = true
