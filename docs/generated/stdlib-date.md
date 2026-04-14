# date

### Date.now

Date — current time in milliseconds since Unix epoch.

TSN currently supports only `Date.now()`. The result is a number of
milliseconds since 1970-01-01 UTC, matching JavaScript's `Date.now()`
behavior. Useful for benchmarks and elapsed-time measurements.

**Syntax:**
```typescript
const t = Date.now()
```

**Returns:** `unknown`

**Compiles to:**
ts_date_now() which calls clock_gettime(CLOCK_REALTIME)
and returns milliseconds as a double (sub-millisecond precision via
the nsec fraction).

**Limitations:**
- Only Date.now() is supported. No new Date(), Date.parse(),
ISO string formatting, timezone handling, or calendar arithmetic.

**Example:**
```typescript
const start = Date.now()
// ... work ...
const elapsed = Date.now() - start
console.log("took:", elapsed, "ms")
```

> Since 0.2.0

---
