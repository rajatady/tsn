/*
 * StrictTS Runtime v4 — Reference Counting
 *
 * Every heap-allocated buffer (string data, array data) carries a refcount.
 * The compiler inserts retain/release automatically:
 *   - retain on assignment, function arg pass, struct field copy
 *   - release at scope exit, reassignment, function return
 * When refcount hits 0, free.
 *
 * Str is still 16 bytes by value. The refcount lives in a separate
 * header before the data pointer, shared across slices.
 */

#ifndef STRICTTS_RUNTIME_H
#define STRICTTS_RUNTIME_H

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <stdbool.h>

/* ─── Refcount Header ────────────────────────────────────────────
 *
 * Allocated block layout:  [int refcount] [data...]
 * The Str/Array data pointer points PAST the header.
 * rc_header() walks back to find it.
 */

typedef struct { int rc; } RcHeader;

/* Get header from data pointer */
static inline RcHeader *rc_header(const void *data) {
    return (RcHeader *)((char *)data - sizeof(RcHeader));
}

/* Allocate a refcounted buffer. Returns pointer to data (past header). */
static inline void *rc_alloc(size_t size) {
    RcHeader *h = (RcHeader *)malloc(sizeof(RcHeader) + size);
    h->rc = 1;
    return (char *)h + sizeof(RcHeader);
}

static inline void rc_retain(const void *data) {
    if (data) rc_header(data)->rc++;
}

/* Returns true if freed */
static inline bool rc_release(const void *data) {
    if (!data) return false;
    RcHeader *h = rc_header(data);
    if (--h->rc <= 0) { free(h); return true; }
    return false;
}

/* ─── Str: 16 bytes, by value ────────────────────────────────────
 *
 * .data points into either:
 *   - .rodata (literal) → rc_buf = NULL, no refcounting
 *   - a rc_alloc'd buffer → rc_buf = the buffer base
 *
 * rc_buf is the pointer we retain/release. It may differ from .data
 * when this Str is a slice (data points into middle of rc_buf's data).
 */

typedef struct {
    const char *data;   /* points to actual chars */
    const char *rc_buf; /* points to rc_alloc'd base (NULL = borrowed/literal) */
    int len;
    int _pad;           /* 8 + 8 + 4 + 4 = 24 bytes. 3 registers on arm64. */
} Str;

/* ─── Str constructors ───────────────────────────────────────────── */

/* Literal — no refcounting, lives in .rodata */
static inline Str str_lit(const char *s) {
    return (Str){ s, NULL, (int)strlen(s), 0 };
}

/* Borrowed view into existing data — no refcounting */
static inline Str str_from(const char *s, int len) {
    return (Str){ s, NULL, len, 0 };
}

/* Heap-allocated, refcounted string */
static inline Str str_rc_new(const char *s, int len) {
    char *buf = (char *)rc_alloc(len + 1);
    memcpy(buf, s, len);
    buf[len] = '\0';
    return (Str){ buf, buf, len, 0 };
}

/* Duplicate to heap with refcount */
static inline Str str_dup(const char *s, int len) {
    return str_rc_new(s, len);
}

/* ─── Str refcount ops ───────────────────────────────────────────── */

static inline Str str_retain(Str s) {
    if (s.rc_buf) rc_retain(s.rc_buf);
    return s;
}

static inline void str_release(Str *s) {
    if (s->rc_buf) {
        rc_release(s->rc_buf);
        s->rc_buf = NULL;
        s->data = NULL;
    }
}

/* ─── Str operations (zero alloc unless noted) ───────────────────── */

static inline Str str_slice(Str s, int start, int end) {
    if (start < 0) start = s.len + start;
    if (end < 0) end = s.len + end;
    if (start < 0) start = 0;
    if (end > s.len) end = s.len;
    if (start >= end) return str_lit("");
    /* Slice shares the source's rc_buf — retain it */
    Str result = { s.data + start, s.rc_buf, end - start, 0 };
    if (result.rc_buf) rc_retain(result.rc_buf);
    return result;
}

static inline bool str_eq(Str a, Str b) {
    return a.len == b.len && (a.len == 0 || memcmp(a.data, b.data, a.len) == 0);
}

static inline char str_at(Str s, int i) {
    return (i >= 0 && i < s.len) ? s.data[i] : '\0';
}

static inline int str_indexOf_from(Str s, Str needle, int start) {
    if (start < 0) start = 0;
    if (start > s.len) return needle.len == 0 ? s.len : -1;
    if (needle.len == 0) return start;
    if (needle.len > s.len - start) return -1;
    for (int i = start; i <= s.len - needle.len; i++) {
        if (memcmp(s.data + i, needle.data, needle.len) == 0) return i;
    }
    return -1;
}

static inline int str_indexOf(Str s, Str needle) {
    return str_indexOf_from(s, needle, 0);
}

static inline bool str_startsWith(Str s, Str p) {
    return p.len <= s.len && memcmp(s.data, p.data, p.len) == 0;
}

static inline bool str_endsWith(Str s, Str p) {
    return p.len <= s.len && memcmp(s.data + s.len - p.len, p.data, p.len) == 0;
}

static inline bool str_includes(Str s, Str needle) {
    return str_indexOf(s, needle) >= 0;
}

static inline bool str_is_space(char c) {
    return c == ' ' || c == '\t' || c == '\n' || c == '\r';
}

static inline Str str_trim_start(Str s) {
    int start = 0;
    while (start < s.len && str_is_space(s.data[start])) start++;
    return str_slice(s, start, s.len);
}

static inline Str str_trim_end(Str s) {
    int end = s.len;
    while (end > 0 && str_is_space(s.data[end - 1])) end--;
    return str_slice(s, 0, end);
}

static inline Str str_trim(Str s) {
    int start = 0;
    int end = s.len;
    while (start < s.len && str_is_space(s.data[start])) start++;
    while (end > start && str_is_space(s.data[end - 1])) end--;
    return str_slice(s, start, end);
}

static inline Str str_lower_ascii(Str s) {
    if (s.len == 0) return str_lit("");
    char *buf = (char *)rc_alloc(s.len + 1);
    for (int i = 0; i < s.len; i++) {
        char c = s.data[i];
        buf[i] = (c >= 'A' && c <= 'Z') ? (char)(c + 32) : c;
    }
    buf[s.len] = '\0';
    return (Str){ buf, buf, s.len, 0 };
}

static inline Str str_upper_ascii(Str s) {
    if (s.len == 0) return str_lit("");
    char *buf = (char *)rc_alloc(s.len + 1);
    for (int i = 0; i < s.len; i++) {
        char c = s.data[i];
        buf[i] = (c >= 'a' && c <= 'z') ? (char)(c - 32) : c;
    }
    buf[s.len] = '\0';
    return (Str){ buf, buf, s.len, 0 };
}

/* ─── StrBuf: stack-based string builder ─────────────────────────── */

typedef struct {
    char *data;
    int len;
    int cap;
    char *stack_buf;
} StrBuf;

#define STRBUF(name, size) \
    char name##_stack[size]; \
    StrBuf name = { name##_stack, 0, size, name##_stack }

static inline void strbuf_ensure(StrBuf *b, int extra) {
    if (b->len + extra <= b->cap) return;
    int new_cap = b->cap * 2;
    while (b->len + extra > new_cap) new_cap *= 2;
    if (b->data == b->stack_buf) {
        b->data = (char *)malloc(new_cap);
        memcpy(b->data, b->stack_buf, b->len);
    } else {
        b->data = (char *)realloc(b->data, new_cap);
    }
    b->cap = new_cap;
    b->stack_buf = NULL;
}

static inline void strbuf_add_char(StrBuf *b, char c) {
    strbuf_ensure(b, 1); b->data[b->len++] = c;
}

static inline void strbuf_add_mem(StrBuf *b, const char *s, int len) {
    strbuf_ensure(b, len); memcpy(b->data + b->len, s, len); b->len += len;
}

static inline void strbuf_add_str(StrBuf *b, Str s) { strbuf_add_mem(b, s.data, s.len); }
static inline void strbuf_add_cstr(StrBuf *b, const char *s) { strbuf_add_mem(b, s, (int)strlen(s)); }

static inline void strbuf_add_int(StrBuf *b, int n) {
    char tmp[32]; int len = snprintf(tmp, sizeof(tmp), "%d", n); strbuf_add_mem(b, tmp, len);
}

static inline void strbuf_add_double(StrBuf *b, double n) {
    char tmp[64]; int len;
    if (n == (int)n && n >= -1e15 && n <= 1e15) len = snprintf(tmp, sizeof(tmp), "%d", (int)n);
    else len = snprintf(tmp, sizeof(tmp), "%g", n);
    strbuf_add_mem(b, tmp, len);
}

static inline Str strbuf_to_str(StrBuf *b) {
    return (Str){ b->data, NULL, b->len, 0 };
}

static inline Str strbuf_to_heap_str(StrBuf *b) {
    return str_rc_new(b->data, b->len);
}

static inline void strbuf_clear(StrBuf *b) { b->len = 0; }

static inline void strbuf_free(StrBuf *b) {
    if (b->stack_buf == NULL && b->data) free(b->data);
}

/* ─── Number → Str ───────────────────────────────────────────────── */

static inline Str num_to_str(double n) {
    static char buf[64]; int len;
    if (n == (int)n && n >= -1e15 && n <= 1e15) len = snprintf(buf, sizeof(buf), "%d", (int)n);
    else len = snprintf(buf, sizeof(buf), "%g", n);
    return (Str){ buf, NULL, len, 0 };
}

/* ─── Typed Dynamic Array with Refcounting ───────────────────────
 *
 * Array data is refcounted. Multiple Array values can share the same
 * backing buffer (e.g. when a struct copies an array field).
 * When the last reference is released, the data is freed.
 *
 * For arrays of Str, release also releases each string's refcount.
 */

#define DEFINE_ARRAY(Name, Type)                                        \
    typedef struct { Type *data; int len; int cap; } Name;              \
    static inline Name Name##_new(void) {                               \
        Name a; a.cap = 16; a.len = 0;                                 \
        a.data = (Type *)rc_alloc(a.cap * sizeof(Type));                \
        return a;                                                       \
    }                                                                   \
    static inline void Name##_push(Name *a, Type v) {                   \
        if (a->len >= a->cap) {                                         \
            int newcap = a->cap * 2;                                    \
            Type *newdata = (Type *)rc_alloc(newcap * sizeof(Type));     \
            memcpy(newdata, a->data, a->len * sizeof(Type));            \
            rc_release(a->data);                                        \
            a->data = newdata;                                          \
            a->cap = newcap;                                            \
        }                                                               \
        a->data[a->len++] = v;                                          \
    }                                                                   \
    static inline Name Name##_slice(Name *a, int s, int e) {            \
        if (s < 0) s = 0; if (e > a->len) e = a->len;                  \
        Name r = Name##_new();                                          \
        for (int i = s; i < e; i++) Name##_push(&r, a->data[i]);       \
        return r;                                                       \
    }                                                                   \
    static inline Name Name##_retain(Name a) {                          \
        if (a.data) rc_retain(a.data);                                  \
        return a;                                                       \
    }                                                                   \
    static inline void Name##_release(Name *a) {                        \
        if (a->data && rc_release(a->data)) {                           \
            a->data = NULL; a->len = 0; a->cap = 0;                    \
        }                                                               \
    }                                                                   \
    static inline void Name##_free(Name *a) { Name##_release(a); }

DEFINE_ARRAY(StrArr, Str)
DEFINE_ARRAY(DoubleArr, double)

static inline StrArr str_split(Str s, Str sep) {
    StrArr out = StrArr_new();
    if (sep.len == 0) {
        for (int i = 0; i < s.len; i++) StrArr_push(&out, str_slice(s, i, i + 1));
        return out;
    }
    int start = 0;
    while (start <= s.len) {
        int idx = str_indexOf_from(s, sep, start);
        if (idx < 0) {
            StrArr_push(&out, str_slice(s, start, s.len));
            break;
        }
        StrArr_push(&out, str_slice(s, start, idx));
        start = idx + sep.len;
    }
    return out;
}

/* Deep release for StrArr — releases each string, then the array */
static inline void StrArr_release_deep(StrArr *a) {
    if (!a->data) return;
    /* Only release strings if we're the last reference to the array */
    RcHeader *h = rc_header(a->data);
    if (h->rc <= 1) {
        for (int i = 0; i < a->len; i++) str_release(&a->data[i]);
    }
    StrArr_release(a);
}

/* ─── console.log — direct stdout ────────────────────────────────── */

static inline void print_str(Str s) { fwrite(s.data, 1, s.len, stdout); }
static inline void print_cstr(const char *s) { fputs(s, stdout); }
static inline void print_num(double n) {
    if (n == (int)n && n >= -1e15 && n <= 1e15) printf("%d", (int)n);
    else printf("%g", n);
}
static inline void print_bool(bool b) { fputs(b ? "true" : "false", stdout); }
static inline void print_nl(void) { putchar('\n'); }

/* ─── JSON Parser ────────────────────────────────────────────────── */

static inline int json_skip_ws(const char *s, int p) {
    while (s[p]==' '||s[p]=='\t'||s[p]=='\n'||s[p]=='\r') p++;
    return p;
}

static inline int json_parse_string(const char *s, int p, Str *out) {
    p++;
    int start = p;
    while (s[p] != '"') p++;
    *out = str_from(s + start, p - start);  /* zero copy, borrowed from input */
    return p + 1;
}

static inline int json_parse_number(const char *s, int p, double *out) {
    char *end; *out = strtod(s + p, &end); return (int)(end - s);
}

static inline int json_parse_bool(const char *s, int p, bool *out) {
    if (strncmp(s + p, "true", 4) == 0) { *out = true; return p + 4; }
    *out = false; return p + 5;
}

/* ─── stdin reader ───────────────────────────────────────────────── */

typedef struct { char *data; int len; } OwnedStr;

static inline OwnedStr read_stdin(void) {
    int cap = 65536, len = 0;
    char *buf = (char *)malloc(cap);
    int n;
    while ((n = (int)fread(buf + len, 1, cap - len, stdin)) > 0) {
        len += n;
        if (len == cap) { cap *= 2; buf = (char *)realloc(buf, cap); }
    }
    buf[len] = '\0';
    return (OwnedStr){ buf, len };
}

/* ─── Math ───────────────────────────────────────────────────────── */

static inline double ts_math_round(double x) { return round(x); }
static inline double ts_math_floor(double x) { return floor(x); }

/* ─── Debug & Crash Handling ─────────────────────────────────────── */

#include "debug.h"
#include "crash.h"

#endif /* STRICTTS_RUNTIME_H */
