/*
 * SQLite Extension Wrapper
 *
 * Bridges the compiled TypeScript fuzzyScore function into SQLite.
 * After loading: SELECT fuzzy_score('Alice Smith', 'ali') → 85
 *
 * Build: clang -shared -o fuzzy_score.dylib sqlite_wrapper.c ../../build/fuzzy_score.c -I../../compiler/runtime -lm
 * Load:  sqlite3 -cmd '.load ./fuzzy_score'
 */

#include <sqlite3ext.h>
SQLITE_EXTENSION_INIT1

#include "../../compiler/runtime/runtime.h"

/* Forward declare the compiled TypeScript function */
double fuzzyScore(Str text, Str query);

/* SQLite function wrapper */
static void sqlite_fuzzy_score(
    sqlite3_context *context,
    int argc,
    sqlite3_value **argv
) {
    if (argc != 2) {
        sqlite3_result_error(context, "fuzzy_score requires 2 arguments", -1);
        return;
    }

    const char *text_raw = (const char *)sqlite3_value_text(argv[0]);
    const char *query_raw = (const char *)sqlite3_value_text(argv[1]);

    if (!text_raw || !query_raw) {
        sqlite3_result_null(context);
        return;
    }

    /* Convert to Str (zero-copy — points into SQLite's memory) */
    Str text = str_from(text_raw, (int)strlen(text_raw));
    Str query = str_from(query_raw, (int)strlen(query_raw));

    /* Call the compiled TypeScript function */
    double score = fuzzyScore(text, query);

    sqlite3_result_double(context, score);
}

/* SQLite extension entry point */
int sqlite3_fuzzyscore_init(
    sqlite3 *db,
    char **pzErrMsg,
    const sqlite3_api_routines *pApi
) {
    SQLITE_EXTENSION_INIT2(pApi);

    int rc = sqlite3_create_function(
        db, "fuzzy_score", 2,
        SQLITE_UTF8 | SQLITE_DETERMINISTIC,
        NULL, sqlite_fuzzy_score, NULL, NULL
    );

    return rc == SQLITE_OK ? SQLITE_OK : SQLITE_ERROR;
}
