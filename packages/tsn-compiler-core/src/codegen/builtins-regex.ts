/**
 * Regex support via POSIX `<regex.h>`.
 *
 * TSN provides basic regex matching through `string.match()` and
 * `string.search()`. Patterns are POSIX Extended Regular Expressions
 * (ERE), passed as plain strings — not `/pattern/` literals.
 *
 * @page stdlib/strings
 * @section regex
 * @syntax s.match("[0-9]+") | s.search("[a-z]+")
 * @compilesTo POSIX regcomp/regexec. The pattern string is compiled
 * at each call (no caching). match() returns a Str slice of the
 * first match (nullable — .data is NULL on no match). search()
 * returns the index of the first match or -1.
 * @example
 * const log = "error: code 404 at line 72"
 * const code = log.match("[0-9]+") ?? "none"  // "404"
 * const idx = log.search("[0-9]+")             // 12
 * @example
 * // Check if a string contains a pattern
 * const hasDigits = s.search("[0-9]") >= 0
 * @limitation Patterns are POSIX ERE, not JavaScript regex. No /flags/.
 * @limitation No global matching (matchAll). Only first match returned.
 * @limitation Pattern is recompiled on every call — no regex caching.
 * @limitation No capture groups — match() returns the full match only.
 * @since 0.2.0
 */
export const REGEX_DOC = true
