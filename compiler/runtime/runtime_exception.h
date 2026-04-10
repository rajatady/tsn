#ifndef TSN_RUNTIME_EXCEPTION_H
#define TSN_RUNTIME_EXCEPTION_H

#include <setjmp.h>

typedef struct TSExceptionFrame {
    jmp_buf env;
    struct TSExceptionFrame *prev;
    Str error;
} TSExceptionFrame;

static TSExceptionFrame *ts_exception_top = NULL;

static inline void ts_throw_unhandled(Str error) {
    fwrite(error.data, 1, error.len, stderr);
    fputc('\n', stderr);
    exit(1);
}

static inline void ts_exception_push(TSExceptionFrame *frame) {
    frame->prev = ts_exception_top;
    frame->error = str_lit("");
    ts_exception_top = frame;
}

static inline void ts_exception_pop(TSExceptionFrame *frame) {
    if (ts_exception_top == frame) ts_exception_top = frame->prev;
}

static inline void ts_exception_throw(Str error) {
    if (ts_exception_top == NULL) {
        ts_throw_unhandled(error);
    }
    ts_exception_top->error = error;
    longjmp(ts_exception_top->env, 1);
}

#endif /* TSN_RUNTIME_EXCEPTION_H */
