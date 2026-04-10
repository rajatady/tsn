#ifndef STRICTTS_RUNTIME_ASYNC_H
#define STRICTTS_RUNTIME_ASYNC_H

/* ─── Minimal Promise Runtime Scaffolding ──────────────────────────
 *
 * This is the type/runtime foundation for TSN async work.
 * It is intentionally small for now: just enough to represent
 * promise-shaped values in generated C while async lowering lands.
 *
 * Important non-goals today:
 * - no continuation list / waiter queue
 * - no event loop integration
 * - no rejection propagation into generated try/catch yet
 * - no retain/release hooks for resolved heap-backed payloads yet
 *
 * Edge cases to handle as async becomes real:
 * - Promise<void> vs Promise<T> layout split
 * - multiple awaits on the same promise
 * - already-resolved vs pending promises at await sites
 * - rejection state carrying richer error information than just Str
 * - thread affinity for UI-hosted callbacks and future networking/timers
 */

typedef enum {
    TS_PROMISE_PENDING = 0,
    TS_PROMISE_FULFILLED = 1,
    TS_PROMISE_REJECTED = 2,
} TSPromiseState;

static inline void ts_promise_panic(Str error) {
    fwrite(error.data, 1, error.len, stderr);
    fputc('\n', stderr);
    exit(1);
}

#define DEFINE_PROMISE(Name, Type)                                      \
    typedef struct {                                                    \
        int state;                                                      \
        Type value;                                                     \
        Str error;                                                      \
    } Name;                                                             \
    static inline Name Name##_pending(void) {                           \
        Name p;                                                         \
        memset(&p, 0, sizeof(Name));                                    \
        p.state = TS_PROMISE_PENDING;                                   \
        p.error = str_lit("");                                          \
        return p;                                                       \
    }                                                                   \
    static inline Name Name##_resolved(Type value) {                    \
        Name p = Name##_pending();                                      \
        p.state = TS_PROMISE_FULFILLED;                                 \
        p.value = value;                                                \
        return p;                                                       \
    }                                                                   \
    static inline Name Name##_rejected(Str error) {                     \
        Name p = Name##_pending();                                      \
        p.state = TS_PROMISE_REJECTED;                                  \
        p.error = error;                                                \
        return p;                                                       \
    }

#define DEFINE_PROMISE_VOID(Name)                                       \
    typedef struct {                                                    \
        int state;                                                      \
        Str error;                                                      \
    } Name;                                                             \
    static inline Name Name##_pending(void) {                           \
        Name p;                                                         \
        memset(&p, 0, sizeof(Name));                                    \
        p.state = TS_PROMISE_PENDING;                                   \
        p.error = str_lit("");                                          \
        return p;                                                       \
    }                                                                   \
    static inline Name Name##_resolved(void) {                          \
        Name p = Name##_pending();                                      \
        p.state = TS_PROMISE_FULFILLED;                                 \
        return p;                                                       \
    }                                                                   \
    static inline Name Name##_rejected(Str error) {                     \
        Name p = Name##_pending();                                      \
        p.state = TS_PROMISE_REJECTED;                                  \
        p.error = error;                                                \
        return p;                                                       \
    }

#define TS_AWAIT(Name, Expr)                                            \
    ({                                                                  \
        Name _ts_promise = (Expr);                                      \
        if (_ts_promise.state == TS_PROMISE_REJECTED) {                 \
            ts_promise_panic(_ts_promise.error);                        \
        }                                                               \
        _ts_promise.value;                                              \
    })

#define TS_AWAIT_VOID(Name, Expr)                                       \
    ({                                                                  \
        Name _ts_promise = (Expr);                                      \
        if (_ts_promise.state == TS_PROMISE_REJECTED) {                 \
            ts_promise_panic(_ts_promise.error);                        \
        }                                                               \
    })

#endif /* STRICTTS_RUNTIME_ASYNC_H */
