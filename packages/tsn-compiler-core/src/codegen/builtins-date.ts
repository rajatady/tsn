/**
 * Date — current time in milliseconds since Unix epoch.
 *
 * TSN currently supports only `Date.now()`. The result is a number of
 * milliseconds since 1970-01-01 UTC, matching JavaScript's `Date.now()`
 * behavior. Useful for benchmarks and elapsed-time measurements.
 *
 * @page stdlib/date
 * @section Date.now
 * @syntax const t = Date.now()
 * @compilesTo ts_date_now() which calls clock_gettime(CLOCK_REALTIME)
 * and returns milliseconds as a double (sub-millisecond precision via
 * the nsec fraction).
 * @example
 * const start = Date.now()
 * // ... work ...
 * const elapsed = Date.now() - start
 * console.log("took:", elapsed, "ms")
 * @limitation Only Date.now() is supported. No new Date(), Date.parse(),
 * ISO string formatting, timezone handling, or calendar arithmetic.
 * @since 0.2.0
 */
export const DATE_DOC = true
