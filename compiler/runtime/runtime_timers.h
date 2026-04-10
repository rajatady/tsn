#ifndef TSN_RUNTIME_TIMERS_H
#define TSN_RUNTIME_TIMERS_H

#include <stdint.h>

#include "runtime_loop.h"

/* ─── Hosted Timers (libuv-backed) ────────────────────────────────
 *
 * Narrow timer v1:
 * - callbacks are plain void(void) functions
 * - TS-facing APIs are setTimeout/setInterval/clearTimeout/clearInterval
 * - timer IDs are stable numeric handles, not raw pointers
 *
 * Still pending:
 * - closure-capturing timer callbacks
 * - timer promises / delay helpers
 * - UI-thread affinity rules once AppKit-hosted async work broadens
 * - richer lifecycle/debug metadata for active timers
 */

typedef void (*TSTimerCallback)(void);

typedef struct TSTimerHandle {
    uv_timer_t handle;
    double id;
    uint64_t repeat_ms;
    TSTimerCallback callback;
    struct TSTimerHandle *next;
} TSTimerHandle;

static inline TSTimerHandle **ts_timer_head_ptr(void) {
    static TSTimerHandle *head = NULL;
    return &head;
}

static inline double ts_next_timer_id(void) {
    static double next_id = 1;
    return next_id++;
}

static inline void ts_timer_list_add(TSTimerHandle *timer) {
    TSTimerHandle **head = ts_timer_head_ptr();
    timer->next = *head;
    *head = timer;
}

static inline void ts_timer_list_remove(TSTimerHandle *timer) {
    TSTimerHandle **head = ts_timer_head_ptr();
    TSTimerHandle *prev = NULL;
    TSTimerHandle *cur = *head;
    while (cur != NULL) {
        if (cur == timer) {
            if (prev) prev->next = cur->next;
            else *head = cur->next;
            cur->next = NULL;
            return;
        }
        prev = cur;
        cur = cur->next;
    }
}

static inline TSTimerHandle *ts_find_timer(double id) {
    TSTimerHandle *cur = *ts_timer_head_ptr();
    while (cur != NULL) {
        if (cur->id == id) return cur;
        cur = cur->next;
    }
    return NULL;
}

static void ts_timer_close_cb(uv_handle_t *handle) {
    TSTimerHandle *timer = (TSTimerHandle *)handle->data;
    free(timer);
}

static inline void ts_timer_dispose(TSTimerHandle *timer) {
    if (timer == NULL) return;
    ts_timer_list_remove(timer);
    uv_timer_stop(&timer->handle);
    uv_close((uv_handle_t *)&timer->handle, ts_timer_close_cb);
}

static void ts_timer_fire(uv_timer_t *handle) {
    TSTimerHandle *timer = (TSTimerHandle *)handle->data;
    if (timer == NULL) return;

    if (timer->callback) timer->callback();

    if (timer->repeat_ms == 0 && ts_find_timer(timer->id) == timer) {
        ts_timer_dispose(timer);
    }
}

static inline double ts_setTimeout(TSTimerCallback callback, double ms) {
    if (callback == NULL) return 0;

    TSTimerHandle *timer = (TSTimerHandle *)malloc(sizeof(TSTimerHandle));
    memset(timer, 0, sizeof(TSTimerHandle));
    timer->id = ts_next_timer_id();
    timer->repeat_ms = 0;
    timer->callback = callback;
    uv_timer_init(ts_uv_loop(), &timer->handle);
    timer->handle.data = timer;
    ts_timer_list_add(timer);
    uv_timer_start(&timer->handle, ts_timer_fire, ms < 0 ? 0 : (uint64_t)ms, 0);
    return timer->id;
}

static inline double ts_setInterval(TSTimerCallback callback, double ms) {
    if (callback == NULL) return 0;

    uint64_t repeat_ms = ms <= 0 ? 1 : (uint64_t)ms;
    TSTimerHandle *timer = (TSTimerHandle *)malloc(sizeof(TSTimerHandle));
    memset(timer, 0, sizeof(TSTimerHandle));
    timer->id = ts_next_timer_id();
    timer->repeat_ms = repeat_ms;
    timer->callback = callback;
    uv_timer_init(ts_uv_loop(), &timer->handle);
    timer->handle.data = timer;
    ts_timer_list_add(timer);
    uv_timer_start(&timer->handle, ts_timer_fire, repeat_ms, repeat_ms);
    return timer->id;
}

static inline void ts_clearTimeout(double id) {
    TSTimerHandle *timer = ts_find_timer(id);
    if (timer) {
        timer->callback = NULL;
        ts_timer_dispose(timer);
    }
}

static inline void ts_clearInterval(double id) {
    ts_clearTimeout(id);
}

#endif /* TSN_RUNTIME_TIMERS_H */
