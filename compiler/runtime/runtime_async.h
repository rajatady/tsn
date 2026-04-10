#ifndef TSN_RUNTIME_ASYNC_H
#define TSN_RUNTIME_ASYNC_H

#include <string.h>

#include "runtime_loop.h"

/* ─── Promise Runtime Scaffolding ───────────────────────────────────
 *
 * Current hosted async model:
 * - Promise values share heap-backed state across copies
 * - hosted async I/O schedules libuv work and resolves that shared state later
 * - await pumps the hosted loop until the promise settles
 * - awaited non-promise values flow through immediately
 * - the same settled promise can be awaited repeatedly through shared state
 *
 * This gives TSN real hosted async I/O now, while the later state-machine
 * lowering work can replace the current blocking await semantics.
 *
 * Still pending:
 * - non-blocking suspension/resumption across function frames
 * - full continuation queues and true concurrent multi-waiter fan-out
 * - cancellation and timers/fetch
 */

typedef enum {
    TS_PROMISE_PENDING = 0,
    TS_PROMISE_FULFILLED = 1,
    TS_PROMISE_REJECTED = 2,
} TSPromiseStateTag;

#define TS_PROMISE_MAGIC 0x54534e50u

typedef struct {
    unsigned int magic;
    int state;
    size_t payload_size;
    Str error;
    const char *type_name;
    unsigned char payload[];
} TSPromiseState;

static inline void ts_promise_reject_raw(TSPromiseState *state, Str error);

static inline TSPromiseState *ts_promise_alloc(size_t payload_size, const char *type_name) {
    TSPromiseState *state = (TSPromiseState *)malloc(sizeof(TSPromiseState) + payload_size);
    if (state == NULL) {
        ts_runtime_fatal("failed to allocate promise state for %s", type_name ? type_name : "<unknown>");
    }
    memset(state, 0, sizeof(TSPromiseState) + payload_size);
    state->magic = TS_PROMISE_MAGIC;
    state->state = TS_PROMISE_PENDING;
    state->payload_size = payload_size;
    state->error = str_lit("");
    state->type_name = type_name;
    return state;
}

static inline void ts_promise_reject_cstr(TSPromiseState *state, const char *message) {
    ts_promise_reject_raw(state, str_rc_new(message, (int)strlen(message)));
}

static inline void ts_promise_rejectf(TSPromiseState *state, const char *fmt, ...) {
    char buffer[512];
    va_list args;
    va_start(args, fmt);
    vsnprintf(buffer, sizeof(buffer), fmt, args);
    va_end(args);
    ts_promise_reject_cstr(state, buffer);
}

static inline void ts_promise_validate_state(TSPromiseState *state, const char *access) {
    if (state == NULL) {
        ts_runtime_fatal("%s used an uninitialized promise value", access);
    }
    if (state->magic != TS_PROMISE_MAGIC) {
        ts_runtime_fatal("%s touched corrupted promise state", access);
    }
}

static inline void ts_promise_validate_payload(
    TSPromiseState *state,
    size_t expected_size,
    const char *expected_type,
    const char *access
) {
    ts_promise_validate_state(state, access);
    if (state->payload_size != expected_size) {
        ts_runtime_fatal(
            "%s expected payload %s (%zu bytes) but got %s (%zu bytes)",
            access,
            expected_type,
            expected_size,
            state->type_name ? state->type_name : "<unknown>",
            state->payload_size
        );
    }
}

static inline void ts_promise_expect_value(
    TSPromiseState *state,
    size_t expected_size,
    const char *expected_type,
    const char *access
) {
    ts_promise_validate_payload(state, expected_size, expected_type, access);
    if (state->state == TS_PROMISE_PENDING) {
        ts_runtime_fatal("%s accessed a pending promise; await it or check .state first", access);
    }
    if (state->state == TS_PROMISE_REJECTED) {
        ts_runtime_fatal("%s accessed a rejected promise; catch the error or inspect .error first", access);
    }
}

static inline void ts_promise_resolve_raw(TSPromiseState *state, const void *value, size_t value_size) {
    if (state == NULL || state->state != TS_PROMISE_PENDING)
        return;
    ts_promise_validate_state(state, "promise resolve");
    if (state->payload_size != value_size) {
        ts_runtime_fatal(
            "promise resolve expected %s payload size %zu but received %zu bytes",
            state->type_name ? state->type_name : "<unknown>",
            state->payload_size,
            value_size
        );
    }
    if (value != NULL && value_size > 0)
        memcpy(state->payload, value, value_size);
    state->state = TS_PROMISE_FULFILLED;
}

static inline void ts_promise_reject_raw(TSPromiseState *state, Str error) {
    if (state == NULL || state->state != TS_PROMISE_PENDING)
        return;
    ts_promise_validate_state(state, "promise reject");
    state->error = error;
    state->state = TS_PROMISE_REJECTED;
}

static inline void ts_promise_panic(Str error) {
    fwrite(error.data, 1, error.len, stderr);
    fputc('\n', stderr);
    exit(1);
}

static inline void ts_promise_wait(TSPromiseState *state) {
    ts_promise_validate_state(state, "await");
    while (state != NULL && state->state == TS_PROMISE_PENDING) {
        if (!ts_uv_step()) {
            ts_promise_panic(str_lit("awaited promise stayed pending with no active libuv work"));
        }
    }
}

#define DEFINE_PROMISE(Name, Type)                                      \
    typedef struct {                                                    \
        TSPromiseState *state;                                          \
    } Name;                                                             \
    static inline Name Name##_pending(void) {                           \
        Name promise;                                                   \
        promise.state = ts_promise_alloc(sizeof(Type), #Type);          \
        return promise;                                                 \
    }                                                                   \
    static inline Name Name##_resolved(Type value) {                    \
        Name promise = Name##_pending();                                \
        ts_promise_resolve_raw(promise.state, &value, sizeof(Type));    \
        return promise;                                                 \
    }                                                                   \
    static inline Name Name##_rejected(Str error) {                     \
        Name promise = Name##_pending();                                \
        ts_promise_reject_raw(promise.state, error);                    \
        return promise;                                                 \
    }                                                                   \
    static inline int Name##_state(Name promise) {                      \
        return promise.state ? promise.state->state : TS_PROMISE_PENDING; \
    }                                                                   \
    static inline Type Name##_value(Name promise) {                     \
        ts_promise_expect_value(promise.state, sizeof(Type), #Type, #Name ".value"); \
        return *(Type *)(void *)promise.state->payload;                 \
    }                                                                   \
    static inline Str Name##_error(Name promise) {                      \
        return promise.state ? promise.state->error : str_lit("");      \
    }                                                                   \
    static inline void Name##_resolve(Name promise, Type value) {       \
        ts_promise_resolve_raw(promise.state, &value, sizeof(Type));    \
    }                                                                   \
    static inline void Name##_reject(Name promise, Str error) {         \
        ts_promise_reject_raw(promise.state, error);                    \
    }

#define DEFINE_PROMISE_VOID(Name)                                       \
    typedef struct {                                                    \
        TSPromiseState *state;                                          \
    } Name;                                                             \
    static inline Name Name##_pending(void) {                           \
        Name promise;                                                   \
        promise.state = ts_promise_alloc(0, "void");                    \
        return promise;                                                 \
    }                                                                   \
    static inline Name Name##_resolved(void) {                          \
        Name promise = Name##_pending();                                \
        ts_promise_resolve_raw(promise.state, NULL, 0);                 \
        return promise;                                                 \
    }                                                                   \
    static inline Name Name##_rejected(Str error) {                     \
        Name promise = Name##_pending();                                \
        ts_promise_reject_raw(promise.state, error);                    \
        return promise;                                                 \
    }                                                                   \
    static inline int Name##_state(Name promise) {                      \
        return promise.state ? promise.state->state : TS_PROMISE_PENDING; \
    }                                                                   \
    static inline Str Name##_error(Name promise) {                      \
        return promise.state ? promise.state->error : str_lit("");      \
    }                                                                   \
    static inline void Name##_resolve(Name promise) {                   \
        ts_promise_resolve_raw(promise.state, NULL, 0);                 \
    }                                                                   \
    static inline void Name##_reject(Name promise, Str error) {         \
        ts_promise_reject_raw(promise.state, error);                    \
    }

#define TS_AWAIT(Name, Expr)                                            \
    ({                                                                  \
        Name _ts_promise = (Expr);                                      \
        ts_promise_wait(_ts_promise.state);                             \
        if (Name##_state(_ts_promise) == TS_PROMISE_REJECTED) {         \
            ts_promise_panic(Name##_error(_ts_promise));                \
        }                                                               \
        Name##_value(_ts_promise);                                      \
    })

#define TS_AWAIT_VOID(Name, Expr)                                       \
    ({                                                                  \
        Name _ts_promise = (Expr);                                      \
        ts_promise_wait(_ts_promise.state);                             \
        if (Name##_state(_ts_promise) == TS_PROMISE_REJECTED) {         \
            ts_promise_panic(Name##_error(_ts_promise));                \
        }                                                               \
    })

#endif /* TSN_RUNTIME_ASYNC_H */
