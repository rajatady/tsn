/**
 * An HTTP response returned by `fetch()`.
 *
 * Provides access to the status, headers, and body of the response.
 * The body is fully buffered — there is no streaming.
 *
 * @page stdlib/http
 * @section Response
 * @example
 * const res = await fetch("https://api.example.com/users")
 * if (res.ok) {
 *   const body = await res.text()
 *   console.log(body)
 * } else {
 *   console.log("Failed:", res.status, res.statusText)
 * }
 * @since 0.1.0
 */
export interface Response {
  /**
   * HTTP status code (e.g. 200, 404, 500).
   * @page stdlib/http
   * @section Response.status
   */
  status: number
  /**
   * HTTP status text (e.g. "OK", "Not Found").
   * @page stdlib/http
   * @section Response.statusText
   */
  statusText: string
  /**
   * `true` if the status code is in the 200-299 range.
   *
   * Use this to check whether the request succeeded before
   * reading the body.
   *
   * @page stdlib/http
   * @section Response.ok
   */
  ok: boolean
  /**
   * The raw response body as a string.
   *
   * Available immediately after the response settles. For most
   * use cases, prefer `text()` which returns a promise.
   *
   * @page stdlib/http
   * @section Response.body
   */
  body: string
  /**
   * Get a response header value by name.
   *
   * Header name lookup is case-insensitive. Returns an empty
   * string if the header is not present.
   *
   * @page stdlib/http
   * @section Response.header
   * @param name The header name to look up
   * @returns The header value, or empty string if not present
   * @example
   * const contentType = res.header("Content-Type")
   */
  header(name: string): string
  /**
   * Read the response body as a string.
   *
   * Returns a promise that resolves to the body text. The body
   * is already buffered, so this resolves immediately.
   *
   * @page stdlib/http
   * @section Response.text
   * @returns A promise resolving to the response body as a string
   */
  text(): Promise<string>
}

/**
 * Perform an HTTP request.
 *
 * Uses the hosted libuv runtime for async I/O. The request runs on
 * a worker thread; the calling async function suspends until the
 * response arrives.
 *
 * Transport failures (DNS, connection refused, timeout) reject the
 * promise. HTTP errors (4xx, 5xx) resolve normally with `ok: false`.
 *
 * @page stdlib/http
 * @section fetch
 * @param url The URL to fetch
 * @param init Optional request configuration — method, body, and headers
 * @returns A promise resolving to the Response
 * @example
 * // Simple GET
 * const res = await fetch("https://httpbin.org/get")
 * const body = await res.text()
 * console.log(body)
 * @example
 * // POST with headers
 * const res = await fetch("https://httpbin.org/post", {
 *   method: "POST",
 *   body: "hello",
 *   headers: { "Content-Type": "text/plain" }
 * })
 * console.log(res.status)
 * @limitation Only method, body, and headers are supported in init.
 * @limitation No request cancellation or AbortController.
 * @limitation No streaming response bodies.
 * @limitation No Response.json() — parse the text manually.
 * @since 0.1.0
 */
export declare function fetch(
  url: string,
  init?: { method?: string, body?: string, headers?: { [name: string]: string } }
): Promise<Response>
