# Runtime Internals

The TSN runtime (`compiler/runtime/runtime.h`) is a single C header providing string handling, arrays, reference counting, and output primitives. Included in every compiled binary.

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
