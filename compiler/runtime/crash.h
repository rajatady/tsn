/*
 * StrictTS Crash Handler — SIGSEGV/SIGABRT → TypeScript stack trace
 *
 * Platform-specific symbolication:
 *   macOS:  backtrace() + atos (Mach-O DWARF)
 *   Linux:  backtrace() + addr2line (ELF DWARF)
 *
 * The #line directives in generated C create DWARF mappings,
 * so the symbolication tool resolves directly to .tsx source lines.
 *
 * In UI apps, shows a red error overlay (like Next.js) before exiting.
 */

#ifndef STRICTTS_CRASH_H
#define STRICTTS_CRASH_H

#include <signal.h>
#include <unistd.h>
#include <string.h>
#include <stdio.h>
#include <stdlib.h>
#include <libgen.h>

#ifdef __APPLE__
#include <execinfo.h>
#include <mach-o/dyld.h>
#elif defined(__linux__)
#include <execinfo.h>
#endif

/* Store binary path for symbolication */
static char g_crash_binary[1024] = {0};

/* ─── Platform-specific stack trace symbolication ───────────────── */

#ifdef __APPLE__

/* macOS: use atos for symbolication */
static int ts_build_stack_trace(void **frames, int count, char *out, int out_size) {
    if (g_crash_binary[0] == '\0' || count <= 0) return 0;

    char cmd[8192];
    const struct mach_header *hdr = _dyld_get_image_header(0);
    int off = snprintf(cmd, sizeof(cmd), "atos -o '%s' -fullPath -l %p",
                       g_crash_binary, (const void *)hdr);

    int start = 2;
    if (start >= count) start = 0;

    for (int i = start; i < count && off < (int)sizeof(cmd) - 32; i++) {
        off += snprintf(cmd + off, sizeof(cmd) - off, " %p", frames[i]);
    }
    strncat(cmd, " 2>/dev/null", sizeof(cmd) - strlen(cmd) - 1);

    FILE *proc = popen(cmd, "r");
    if (!proc) return 0;

    int written = 0;
    int out_off = 0;
    char line[1024];
    while (fgets(line, sizeof(line), proc)) {
        int len = (int)strlen(line);
        if (len > 0 && line[len - 1] == '\n') line[len - 1] = '\0';

        if (strstr(line, "ts_crash_handler") || strstr(line, "_sigtramp") ||
            strstr(line, "ts_bounds_error") || strstr(line, "???"))
            continue;

        int n = snprintf(out + out_off, out_size - out_off, "#%d  %s\n", written, line);
        if (n > 0 && out_off + n < out_size) out_off += n;
        written++;
        if (written >= 15) break;
    }
    pclose(proc);
    return written;
}

#elif defined(__linux__)

/* Linux: use addr2line for symbolication */
static int ts_build_stack_trace(void **frames, int count, char *out, int out_size) {
    if (g_crash_binary[0] == '\0' || count <= 0) return 0;

    int written = 0;
    int out_off = 0;
    int start = 2;
    if (start >= count) start = 0;

    for (int i = start; i < count && written < 15; i++) {
        char cmd[2048];
        snprintf(cmd, sizeof(cmd), "addr2line -e '%s' -f -p %p 2>/dev/null",
                 g_crash_binary, frames[i]);

        FILE *proc = popen(cmd, "r");
        if (!proc) continue;

        char line[1024];
        if (fgets(line, sizeof(line), proc)) {
            int len = (int)strlen(line);
            if (len > 0 && line[len - 1] == '\n') line[len - 1] = '\0';

            /* Skip internal frames and unknown symbols */
            if (strstr(line, "ts_crash_handler") || strstr(line, "ts_bounds_error") ||
                strstr(line, "??:") || strstr(line, "?? "))
            {
                pclose(proc);
                continue;
            }

            int n = snprintf(out + out_off, out_size - out_off, "#%d  %s\n", written, line);
            if (n > 0 && out_off + n < out_size) out_off += n;
            written++;
        }
        pclose(proc);
    }
    return written;
}

#else

/* Unsupported platform — no symbolication, fallback only */
static int ts_build_stack_trace(void **frames, int count, char *out, int out_size) {
    (void)frames; (void)count; (void)out; (void)out_size;
    return 0;
}

#endif /* platform symbolication */

/* ─── Crash handler (shared across platforms) ───────────────────── */

static void ts_crash_handler(int sig) {
    const char *name = sig == SIGSEGV ? "Segmentation Fault" :
                       sig == SIGABRT ? "Abort" :
                       sig == SIGBUS  ? "Bus Error" : "Signal";

    /* Capture stack frames */
    void *frames[64];
    int count = backtrace(frames, 64);

    /* Build symbolicated stack trace */
    char stack_buf[4096] = {0};
    int stack_frames = ts_build_stack_trace(frames, count, stack_buf, sizeof(stack_buf));

    /* Extract first .ts/.tsx file:line from stack trace for overlay */
    char crash_file[512] = {0};
    int crash_line = 0;
    if (stack_frames > 0) {
        const char *p = stack_buf;
        while (*p) {
            const char *ts_ext = strstr(p, ".ts:");
            if (!ts_ext) ts_ext = strstr(p, ".tsx:");
            if (ts_ext) {
                const char *path_start = ts_ext;
                while (path_start > p && *(path_start - 1) != '(' && *(path_start - 1) != ' ')
                    path_start--;
                const char *colon = strstr(ts_ext, ".ts:");
                if (!colon) colon = strstr(ts_ext, ".tsx:");
                if (colon) {
                    colon = strchr(colon + 3, ':');
                    if (!colon) colon = strchr(ts_ext + 3, ':');
                }
                if (colon) {
                    int path_len = (int)(colon - path_start);
                    if (path_len > 0 && path_len < (int)sizeof(crash_file)) {
                        memcpy(crash_file, path_start, path_len);
                        crash_file[path_len] = '\0';
                        crash_line = atoi(colon + 1);
                    }
                }
                break;
            }
            const char *nl = strchr(p, '\n');
            if (!nl) break;
            p = nl + 1;
        }
    }

    /* Terminal output (always) */
    fprintf(stderr, "\n\033[31m━━━ %s ━━━\033[0m\n\n", name);

    if (stack_frames > 0) {
        const char *line_start = stack_buf;
        while (*line_start) {
            const char *nl = strchr(line_start, '\n');
            int line_len = nl ? (int)(nl - line_start) : (int)strlen(line_start);

            if (strstr(line_start, ".ts:") || strstr(line_start, ".tsx:")) {
                fprintf(stderr, "  \033[36m%.*s\033[0m\n", line_len, line_start);
            } else {
                fprintf(stderr, "  \033[90m%.*s\033[0m\n", line_len, line_start);
            }
            if (!nl) break;
            line_start = nl + 1;
        }
        fprintf(stderr, "\n\033[90m  Binary: %s\033[0m\n", g_crash_binary);
#ifdef __APPLE__
        fprintf(stderr, "\033[90m  Debug:  lldb %s\033[0m\n\n", g_crash_binary);
#else
        fprintf(stderr, "\033[90m  Debug:  gdb %s\033[0m\n\n", g_crash_binary);
#endif
    } else {
        char **syms = backtrace_symbols(frames, count);
        if (syms) {
            for (int i = 2; i < count && i < 22; i++)
                fprintf(stderr, "    #%d %s\n", i - 2, syms[i]);
            free(syms);
            fprintf(stderr, "\n");
        }
    }

    /* UI overlay (if available — set by ui_init).
     * Don't show overlay for SIGABRT caused by bounds check — the bounds
     * error handler already shows the overlay before calling abort(). */
    if (g_error_overlay_fn && sig != SIGABRT) {
        char title[128];
        snprintf(title, sizeof(title), "%s", name);

        if (crash_file[0]) {
            g_error_overlay_fn(title, stack_buf, crash_file, crash_line, stack_buf);
        } else {
            g_error_overlay_fn(title,
                "The application crashed.\nCheck the terminal for the full stack trace.",
                "", 0, stack_buf);
        }
    }

    _exit(128 + sig);
}

/* ─── Install crash handler ─────────────────────────────────────── */

static void ts_install_crash_handler(const char *binary_path) {
    if (binary_path) {
        char *resolved = realpath(binary_path, NULL);
        if (resolved) {
            strncpy(g_crash_binary, resolved, sizeof(g_crash_binary) - 1);
            free(resolved);
        } else {
            strncpy(g_crash_binary, binary_path, sizeof(g_crash_binary) - 1);
        }
    } else {
#ifdef __APPLE__
        uint32_t size = sizeof(g_crash_binary);
        _NSGetExecutablePath(g_crash_binary, &size);
#elif defined(__linux__)
        ssize_t len = readlink("/proc/self/exe", g_crash_binary, sizeof(g_crash_binary) - 1);
        if (len > 0) g_crash_binary[len] = '\0';
#endif
    }

    struct sigaction sa;
    memset(&sa, 0, sizeof(sa));
    sa.sa_handler = ts_crash_handler;
    sa.sa_flags = SA_RESETHAND;

    sigaction(SIGSEGV, &sa, NULL);
    sigaction(SIGABRT, &sa, NULL);
    sigaction(SIGBUS,  &sa, NULL);
}

#endif /* STRICTTS_CRASH_H */
