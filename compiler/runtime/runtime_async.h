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
 *
 * This gives TSN real hosted async I/O now, while the later state-machine
 * lowering work can replace the current blocking await semantics.
 *
 * Still pending:
 * - non-blocking suspension/resumption across function frames
 * - continuation queues and multi-waiter fan-out
 * - rejection flow into try/catch
 * - cancellation and timers/fetch
 */

typedef enum {
    TS_PROMISE_PENDING = 0,
    TS_PROMISE_FULFILLED = 1,
    TS_PROMISE_REJECTED = 2,
} TSPromiseStateTag;

typedef struct {
    int state;
    int _pad;
    Str error;
    unsigned char payload[];
} TSPromiseState;

static inline TSPromiseState *ts_promise_alloc(size_t payload_size) {
    TSPromiseState *state = (TSPromiseState *)malloc(sizeof(TSPromiseState) + payload_size);
    memset(state, 0, sizeof(TSPromiseState) + payload_size);
    state->state = TS_PROMISE_PENDING;
    state->error = str_lit("");
    return state;
}

static inline void ts_promise_resolve_raw(TSPromiseState *state, const void *value, size_t value_size) {
    if (value != NULL && value_size > 0)
        memcpy(state->payload, value, value_size);
    state->state = TS_PROMISE_FULFILLED;
}

static inline void ts_promise_reject_raw(TSPromiseState *state, Str error) {
    state->error = error;
    state->state = TS_PROMISE_REJECTED;
}

static inline void ts_promise_panic(Str error) {
    fwrite(error.data, 1, error.len, stderr);
    fputc('\n', stderr);
    exit(1);
}

static inline void ts_promise_wait(TSPromiseState *state) {
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
        promise.state = ts_promise_alloc(sizeof(Type));                 \
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
        promise.state = ts_promise_alloc(0);                            \
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
