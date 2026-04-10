# Runtime Internals

The TSN runtime is rooted at [compiler/runtime/runtime.h](/Users/kumardivyarajat/.codex/worktrees/94d7/vite/compiler/runtime/runtime.h). It now includes smaller runtime fragments instead of owning every subsystem inline:

- [runtime_loop.h](/Users/kumardivyarajat/.codex/worktrees/94d7/vite/compiler/runtime/runtime_loop.h) for hosted libuv loop ownership
- [runtime_async.h](/Users/kumardivyarajat/.codex/worktrees/94d7/vite/compiler/runtime/runtime_async.h) for promise/await scaffolding
- [runtime_hosted_io.h](/Users/kumardivyarajat/.codex/worktrees/94d7/vite/compiler/runtime/runtime_hosted_io.h) for hosted file/process I/O
- [runtime_fetch.h](/Users/kumardivyarajat/.codex/worktrees/94d7/vite/compiler/runtime/runtime_fetch.h) for hosted fetch and `Response`
- [runtime_timers.h](/Users/kumardivyarajat/.codex/worktrees/94d7/vite/compiler/runtime/runtime_timers.h) for hosted timer handles and callbacks
- [runtime_exception.h](/Users/kumardivyarajat/.codex/worktrees/94d7/vite/compiler/runtime/runtime_exception.h) for narrow exception frames
- [debug.h](/Users/kumardivyarajat/.codex/worktrees/94d7/vite/compiler/runtime/debug.h) for bounds checks
- [crash.h](/Users/kumardivyarajat/.codex/worktrees/94d7/vite/compiler/runtime/crash.h) for crash traces

`runtime.h` is still the include used by generated C, but the implementation is no longer one growing blob.

## Str — 24-byte Value Type

```c
typedef struct {
    const char *data;      // pointer to actual characters
    const char *rc_buf;    // pointer to refcounted buffer base (NULL = literal/borrowed)
    int len;               // string length
    int _pad;              // padding to 24 bytes
} Str;
```

Str is passed by value on the stack (3 registers on ARM64). No heap allocation for literals or slices.

### Ownership Model

| Constructor | Ownership | Refcounted | When |
|-------------|-----------|------------|------|
| `str_lit("hello")` | Borrowed from .rodata | No | String literals |
| `str_from(ptr, len)` | Borrowed view | No | Temporary views into existing data |
| `str_rc_new(ptr, len)` | Owned, heap | Yes (rc=1) | String concatenation results |
| `str_dup(ptr, len)` | Owned, heap | Yes (rc=1) | Explicit duplication |

### Reference Counting

```c
str_retain(s)      // increment refcount (no-op if literal/borrowed)
str_release(&s)    // decrement refcount, free if 0 (no-op if literal/borrowed)
```

Slices share the source's refcount buffer:
```c
Str name = str_lit("Alice Smith");
Str first = str_slice(name, 0, 5);    // "Alice" — shares name's data, no alloc
```

The compiler inserts retain/release automatically:
- Retain on: push to array, struct field copy, function return
- Release on: scope exit, variable reassignment, function return cleanup

### Operations (zero-alloc)

| Function | Signature | Notes |
|----------|-----------|-------|
| `str_slice(s, start, end)` | `Str` | Shares source refcount |
| `str_eq(a, b)` | `bool` | memcmp-based |
| `str_at(s, i)` | `char` | Returns '\0' if out of bounds |
| `str_indexOf(s, needle)` | `int` | -1 if not found |
| `str_startsWith(s, prefix)` | `bool` | |
| `str_endsWith(s, suffix)` | `bool` | |
| `str_includes(s, needle)` | `bool` | |

## StrBuf — Stack String Builder

For string concatenation. Starts on the stack, spills to heap only when needed.

```c
#define STRBUF(name, size) \
    char name##_stack[size]; \
    StrBuf name = { name##_stack, 0, size, name##_stack }
```

Usage:
```c
STRBUF(buf, 256);                    // 256 bytes on stack
strbuf_add_cstr(&buf, "Hello, ");    // append C string
strbuf_add_str(&buf, name);          // append Str
strbuf_add_int(&buf, 42);            // append formatted int
Str result = strbuf_to_heap_str(&buf);  // finalize to refcounted Str
strbuf_free(&buf);                   // free if spilled to heap
```

The compiler detects string accumulation patterns (`str = str + x` in loops) and automatically rewrites them to use StrBuf.

## Reference Counting Core

```c
typedef struct { int rc; } RcHeader;
```

Memory layout: `[RcHeader][data...]`. The data pointer points past the header.

| Function | Behavior |
|----------|----------|
| `rc_alloc(size)` | Allocate refcounted buffer (rc=1) |
| `rc_retain(data)` | Increment refcount |
| `rc_release(data)` | Decrement; free if rc reaches 0 |
| `rc_header(data)` | Get header from data pointer |

## Typed Dynamic Arrays

```c
DEFINE_ARRAY(StrArr, Str)
DEFINE_ARRAY(DoubleArr, double)
// For custom types:
DEFINE_ARRAY(EmployeeArr, Employee)
```

Each `DEFINE_ARRAY(Name, Type)` generates:

| Function | Signature |
|----------|-----------|
| `Name_new()` | `Name` — initial capacity 16 |
| `Name_push(&arr, val)` | `void` — amortized O(1) |
| `Name_slice(&arr, start, end)` | `Name` — new array with copied elements |
| `Name_retain(arr)` | `Name` — increment array buffer refcount |
| `Name_release(&arr)` | `void` — decrement, free if 0 |

Array data is refcounted. Multiple array values can share the same backing buffer.

### Deep Release for String Arrays

```c
StrArr_release_deep(&arr)   // releases each string's refcount, then the array
```

Only releases string elements when the array buffer's refcount reaches 0 (last reference).

## Promise Runtime Scaffolding

Narrow hosted async support uses promise carrier structs generated from macros in [runtime_async.h](/Users/kumardivyarajat/.codex/worktrees/94d7/vite/compiler/runtime/runtime_async.h).

```c
DEFINE_PROMISE(Promise_Str, Str)
DEFINE_PROMISE_VOID(Promise_void)
```

Current runtime helpers include:

- `TS_AWAIT(Promise_T, expr)` for value-returning awaits
- `TS_AWAIT_VOID(Promise_void, expr)` for void awaits

Important current limitation:

- these are now event-loop-backed hosted promises
- `await` blocks the current frame by pumping the hosted libuv loop
- awaiting a plain non-promise value is an immediate pass-through in the current lowering
- the same settled promise can be awaited repeatedly because the state is shared
- rejected promises can be caught through `try/catch` around `await`
- promise `.value` access is guarded:
  - pending promise reads fail loudly
  - rejected promise reads fail loudly
  - payload-size mismatches fail loudly instead of reading arbitrary memory
- continuation queues and resumable state-machine lowering are still future work

So the runtime promise layer is real now, but it is still the narrow hosted async v1 rather than the final resumable async runtime.

## Exception Runtime

Narrow `throw` / `try/catch` support now uses lightweight exception frames from [runtime_exception.h](/Users/kumardivyarajat/.codex/worktrees/94d7/vite/compiler/runtime/runtime_exception.h).

Current model:

- generated `try/catch` pushes a `TSExceptionFrame`
- `throw` in sync code raises through `ts_exception_throw(...)`
- `await` inside `try` raises rejected promise errors through the same path
- uncaught errors still terminate the process

Current limitation:

- `finally` is not implemented
- exception-path cleanup is still intentionally narrow
- richer typed error objects are not implemented; string-shaped errors are the supported path

## Hosted File / Process I/O

Hosted sync I/O now lives in [runtime_hosted_io.h](/Users/kumardivyarajat/.codex/worktrees/94d7/vite/compiler/runtime/runtime_hosted_io.h).

Available sync helpers:

- `ts_readFile`
- `ts_writeFile`
- `ts_appendFile`
- `ts_fileExists`
- `ts_fileSize`
- `ts_listDir`
- `ts_exec`

The compiler currently emits async hosted wrappers on top of these helpers for:

- `readFileAsync`
- `writeFileAsync`
- `appendFileAsync`
- `fileExistsAsync`
- `fileSizeAsync`
- `listDirAsync`
- `execAsync`

Those async wrappers now schedule work on libuv's worker pool and settle shared promise state in the after-work callback. They are real hosted async operations now, even though `await` still blocks the current frame instead of suspending a resumable state machine.

Current failure behavior:

- `readFileAsync`, `writeFileAsync`, `appendFileAsync`, `fileSizeAsync`, and `listDirAsync` reject on real OS failures
- `fileExistsAsync` still resolves `false` instead of rejecting
- `execAsync` resolves the process exit status, but rejects true launcher/runtime failures
- libuv submission or after-work failures reject with runtime-generated error strings

## Hosted Fetch

Hosted fetch now lives in [runtime_fetch.h](/Users/kumardivyarajat/.codex/worktrees/94d7/vite/compiler/runtime/runtime_fetch.h).

Current model:

- fetch work is scheduled on libuv's worker pool
- libcurl performs the actual HTTP request inside the worker job
- transport failures reject the promise
- HTTP status codes still resolve a `Response` value, with `ok` derived from the 2xx range
- `Response.text()` is a narrow helper that resolves the already-buffered body as `Promise<string>`
- libuv-side scheduler failures also reject instead of leaving the promise pending

Current limitation:

- only `method` and `body` are supported in the init object
- headers are not supported
- body streaming is not supported
- cancellation and `AbortController` are not supported
- `Response.json()`, `statusText`, and richer metadata are not implemented yet

## Hosted Timers

Hosted timers now live in [runtime_timers.h](/Users/kumardivyarajat/.codex/worktrees/94d7/vite/compiler/runtime/runtime_timers.h).

Available runtime helpers:

- `ts_setTimeout`
- `ts_setInterval`
- `ts_clearTimeout`
- `ts_clearInterval`

Current timer model:

- timers are backed by libuv `uv_timer_t` handles
- callbacks run as plain `void(void)` native functions
- timer IDs are numeric handles managed by the TSN runtime
- `setInterval(..., 0)` is normalized to a real repeating tick instead of a non-repeating zero-delay handle

Current limitation:

- captured closures are not supported for timer callbacks
- timer promises / delay helpers are not implemented
- timers share the same hosted loop as async I/O, but there is no resumable async state-machine integration yet

## Output Functions

| Function | Output |
|----------|--------|
| `print_str(Str s)` | Write string bytes to stdout |
| `print_cstr(const char *s)` | Write C string to stdout |
| `print_num(double n)` | Format number and write |
| `print_bool(bool b)` | Write "true" or "false" |
| `print_nl()` | Write newline |

## Number Formatting

```c
Str num_to_str(double n)   // returns borrowed Str (static buffer — not thread-safe)
```

Integers print without decimal point. Floats use `%g` format.

## JSON Parser Primitives

| Function | Behavior |
|----------|----------|
| `json_skip_ws(s, pos)` | Skip whitespace |
| `json_parse_string(s, pos, &out)` | Parse "..." → Str (borrowed from input) |
| `json_parse_number(s, pos, &out)` | Parse number → double |
| `json_parse_bool(s, pos, &out)` | Parse true/false → bool |

The compiler generates full JSON array parsers for specific interface types.

## stdin Reader

```c
OwnedStr read_stdin(void)   // reads all of stdin into malloc'd buffer
```

Returns `{char *data, int len}`. Caller owns the memory.
