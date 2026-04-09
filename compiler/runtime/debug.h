/*
 * TSN Debug Mode — Bounds Checking & Error Overlay
 *
 * Enabled with -DTSN_DEBUG (dev mode default).
 * In release builds, all macros compile to zero-overhead direct access.
 *
 * When a UI app is running, errors show as a red overlay in the window
 * (like Next.js error overlay). Terminal output always happens too.
 */

#ifndef TSN_DEBUG_H
#define TSN_DEBUG_H

#include <stdio.h>
#include <stdlib.h>

/* ─── Error Overlay Callback ─────────────────────────────────────
 * Set by ui_init() in UI apps. When set, errors show in-app overlay
 * before crashing. NULL in CLI apps → terminal-only. */

typedef void (*TSErrorOverlayFn)(const char *title, const char *message,
                                  const char *file, int line,
                                  const char *stack_trace);

/* NOT static — must be shared across translation units (ui.m sets it, generated .c reads it) */
TSErrorOverlayFn g_error_overlay_fn __attribute__((weak)) = NULL;

static inline void ts_set_error_overlay(TSErrorOverlayFn fn) {
    g_error_overlay_fn = fn;
}

#ifdef TSN_DEBUG

static void ts_bounds_error(const char *arr_name, int index, int length,
                            const char *file, int line) {
    /* Terminal output (always) */
    fprintf(stderr, "\n\033[31m━━━ Array index out of bounds ━━━\033[0m\n\n");
    fprintf(stderr, "  \033[36m%s:%d\033[0m\n", file, line);
    fprintf(stderr, "  %s[%d] — array length is %d\n\n", arr_name, index, length);
    if (index < 0) {
        fprintf(stderr, "  \033[90mIndex is negative.\033[0m\n\n");
    } else {
        fprintf(stderr, "  \033[90mValid indices: 0..%d\033[0m\n\n", length - 1);
    }

    /* UI overlay (if available) */
    if (g_error_overlay_fn) {
        char msg[512];
        if (index < 0) {
            snprintf(msg, sizeof(msg),
                "%s[%d]\n\nArray length is %d\nIndex is negative",
                arr_name, index, length);
        } else {
            snprintf(msg, sizeof(msg),
                "%s[%d]\n\nArray length is %d\nValid indices: 0..%d",
                arr_name, index, length, length - 1);
        }
        g_error_overlay_fn("Array Index Out of Bounds", msg, file, line, NULL);
    }

    abort(); /* Triggers crash handler → full stack trace */
}

/* Bounds-checked array access — reports TypeScript source location on failure. */
#define ARRAY_GET(arr, i, name, file, line) \
    ((int)(i) >= 0 && (int)(i) < (arr).len \
        ? (arr).data[(int)(i)] \
        : (ts_bounds_error(name, (int)(i), (arr).len, file, line), (arr).data[0]))

/* Bounds-checked array set */
#define ARRAY_SET(arr, i, val, name, file, line) \
    do { \
        int _idx = (int)(i); \
        if (_idx < 0 || _idx >= (arr).len) \
            ts_bounds_error(name, _idx, (arr).len, file, line); \
        (arr).data[_idx] = (val); \
    } while(0)

#else

/* Release mode — zero overhead */
#define ARRAY_GET(arr, i, name, file, line) (arr).data[(int)(i)]
#define ARRAY_SET(arr, i, val, name, file, line) ((arr).data[(int)(i)] = (val))

#endif /* TSN_DEBUG */

#endif /* TSN_DEBUG_H */
