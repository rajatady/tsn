# HTTP (@tsn/http)

## Contents

- [Response](#response)
- [Response.status](#response-status)
- [Response.statusText](#response-statustext)
- [Response.ok](#response-ok)
- [Response.body](#response-body)
- [Response.header](#response-header)
- [Response.text](#response-text)
- [fetch](#fetch)

### Response

An HTTP response returned by `fetch()`.

Provides access to the status, headers, and body of the response.
The body is fully buffered — there is no streaming.

**Example:**
```typescript
const res = await fetch("https://api.example.com/users")
if (res.ok) {
  const body = await res.text()
  console.log(body)
} else {
  console.log("Failed:", res.status, res.statusText)
}
```

> Since 0.1.0

---

### Response.status

HTTP status code (e.g. 200, 404, 500).

**Returns:** `number`

---

### Response.statusText

HTTP status text (e.g. "OK", "Not Found").

**Returns:** `string`

---

### Response.ok

`true` if the status code is in the 200-299 range.

Use this to check whether the request succeeded before
reading the body.

**Returns:** `boolean`

---

### Response.body

The raw response body as a string.

Available immediately after the response settles. For most
use cases, prefer `text()` which returns a promise.

**Returns:** `string`

---

### Response.header

Get a response header value by name.

Header name lookup is case-insensitive. Returns an empty
string if the header is not present.

**Signature:**
```typescript
header(name: string): string
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `name` | `string` | The header name to look up |

**Returns:** `string` — The header value, or empty string if not present

**Example:**
```typescript
const contentType = res.header("Content-Type")
```

---

### Response.text

Read the response body as a string.

Returns a promise that resolves to the body text. The body
is already buffered, so this resolves immediately.

**Signature:**
```typescript
text(): Promise<string>
```

**Returns:** `Promise<string>` — A promise resolving to the response body as a string

---

### fetch

Perform an HTTP request.

Uses the hosted libuv runtime for async I/O. The request runs on
a worker thread; the calling async function suspends until the
response arrives.

Transport failures (DNS, connection refused, timeout) reject the
promise. HTTP errors (4xx, 5xx) resolve normally with `ok: false`.

**Signature:**
```typescript
function fetch(url: string, init?: { method?: string, body?: string, headers?: { [name: string]: string } }): Promise<Response>
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `url` | `string` | The URL to fetch |
| `init` | `{ method?: string, body?: string, headers?: { [name: string]: string } }` (optional) | Optional request configuration — method, body, and headers |

**Returns:** `Promise<Response>` — A promise resolving to the Response

**Limitations:**
- Only method, body, and headers are supported in init.
- No request cancellation or AbortController.
- No streaming response bodies.
- No Response.json() — parse the text manually.

**Examples:**
```typescript
// Simple GET
const res = await fetch("https://httpbin.org/get")
const body = await res.text()
console.log(body)
```
```typescript
// POST with headers
const res = await fetch("https://httpbin.org/post", {
  method: "POST",
  body: "hello",
  headers: { "Content-Type": "text/plain" }
})
console.log(res.status)
```

> Since 0.1.0

---
