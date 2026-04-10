/*
 * TSN Dev Host — hot-reload via dlopen/dlclose
 *
 * Watches for a signal file, reloads the dylib, calls ts_main().
 * For UI apps: the first load creates the window.
 * Subsequent reloads would need UI state preservation (future).
 *
 * For now: simple compile-and-run with watch detection.
 */

#include <stdio.h>
#include <stdlib.h>
#include <dlfcn.h>
#include <unistd.h>
#include <sys/stat.h>
#include <string.h>

static time_t file_mtime(const char *path) {
    struct stat st;
    if (stat(path, &st) != 0) return 0;
    return st.st_mtimespec.tv_sec;
}

int main(int argc, char **argv) {
    if (argc < 2) {
        fprintf(stderr, "Usage: dev-host <dylib-path>\n");
        return 1;
    }

    const char *dylib_path = argv[1];
    time_t last_mtime = 0;

    printf("┌─ TSN Dev Server ─────────────────┐\n");
    printf("│  Watching: %s\n", dylib_path);
    printf("│  Press Ctrl+C to stop                  │\n");
    printf("└────────────────────────────────────────┘\n\n");

    while (1) {
        time_t mt = file_mtime(dylib_path);
        if (mt == 0) {
            /* dylib doesn't exist yet — wait */
            usleep(200000);
            continue;
        }

        if (mt > last_mtime) {
            last_mtime = mt;

            /* Load and run */
            void *lib = dlopen(dylib_path, RTLD_NOW);
            if (!lib) {
                fprintf(stderr, "[dev] dlopen error: %s\n", dlerror());
                usleep(500000);
                continue;
            }

            void (*entry)(void) = (void (*)(void))dlsym(lib, "ts_main");
            if (!entry) {
                /* Try _main or main */
                entry = (void (*)(void))dlsym(lib, "app_main");
            }

            if (entry) {
                printf("[dev] Running...\n");
                entry();
                /* For UI apps, ts_main blocks (ui_run). When window closes, it returns. */
            } else {
                fprintf(stderr, "[dev] No entry point found (ts_main or app_main)\n");
            }

            dlclose(lib);
            printf("[dev] Reloading on next change...\n");
        }

        usleep(200000); /* 200ms poll */
    }

    return 0;
}
