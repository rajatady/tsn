#ifndef TSN_RUNTIME_LOOP_H
#define TSN_RUNTIME_LOOP_H

#include <stdbool.h>
#include <stdlib.h>
#include <uv.h>

static inline uv_loop_t *ts_uv_loop(void) {
    static uv_loop_t *loop = NULL;
    if (loop == NULL) {
        loop = (uv_loop_t *)malloc(sizeof(uv_loop_t));
        if (uv_loop_init(loop) != 0) abort();
    }
    return loop;
}

static inline bool ts_uv_step(void) {
    uv_loop_t *loop = ts_uv_loop();
    if (!uv_loop_alive(loop))
        return false;
    uv_run(loop, UV_RUN_ONCE);
    return true;
}

#endif /* TSN_RUNTIME_LOOP_H */
