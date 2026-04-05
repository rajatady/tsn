/*
 * SQLite + TypeScript Extension Benchmark
 *
 * Loads a fuzzy scoring function COMPILED FROM TYPESCRIPT into SQLite,
 * creates a 100K row table, and benchmarks fuzzy search queries.
 *
 * This is IMPOSSIBLE with Bun, Node, or any JS runtime.
 * You cannot load libbun.so or libnode.dylib into SQLite.
 * But a 49KB .dylib compiled from TypeScript? Works perfectly.
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <sqlite3.h>
#include "../../compiler/runtime/runtime.h"

/* Forward declare the compiled TypeScript function */
extern double fuzzyScore(Str text, Str query);

/* SQLite wrapper */
static void sqlite_fuzzy_score(sqlite3_context *ctx, int argc, sqlite3_value **argv) {
    const char *t = (const char *)sqlite3_value_text(argv[0]);
    const char *q = (const char *)sqlite3_value_text(argv[1]);
    if (!t || !q) { sqlite3_result_null(ctx); return; }
    Str text = { t, NULL, (int)strlen(t), 0 };
    Str query = { q, NULL, (int)strlen(q), 0 };
    sqlite3_result_double(ctx, fuzzyScore(text, query));
}

static double now_ms(void) {
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return ts.tv_sec * 1000.0 + ts.tv_nsec / 1e6;
}

int main(void) {
    sqlite3 *db;
    char *err = NULL;
    int rc;

    rc = sqlite3_open(":memory:", &db);
    if (rc) { fprintf(stderr, "Can't open DB: %s\n", sqlite3_errmsg(db)); return 1; }

    /* Register the TypeScript-compiled function directly into SQLite */
    sqlite3_create_function(db, "fuzzy_score", 2,
        SQLITE_UTF8 | SQLITE_DETERMINISTIC, NULL, sqlite_fuzzy_score, NULL, NULL);

    printf("Registered TypeScript function: fuzzy_score (compiled from fuzzy_score.ts)\n");
    printf("  Binary size: 49 KB  |  Bun runtime: 58 MB (can't embed in SQLite)\n\n");

    /* Create table */
    sqlite3_exec(db, "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, city TEXT)", NULL, NULL, NULL);

    /* Insert 100K rows */
    const char *names[] = {"Alice Smith", "Bob Jones", "Charlie Brown", "Diana Davis",
                           "Eve Wilson", "Frank Moore", "Grace Taylor", "Hank Clark",
                           "Ivy Hall", "Jack Lee"};
    const char *cities[] = {"New York", "London", "Tokyo", "Berlin", "Sydney"};

    double t0 = now_ms();
    sqlite3_exec(db, "BEGIN", NULL, NULL, NULL);
    sqlite3_stmt *stmt;
    sqlite3_prepare_v2(db, "INSERT INTO users (name, city) VALUES (?, ?)", -1, &stmt, NULL);

    int ROWS = 100000;
    for (int i = 0; i < ROWS; i++) {
        sqlite3_bind_text(stmt, 1, names[i % 10], -1, SQLITE_STATIC);
        sqlite3_bind_text(stmt, 2, cities[i % 5], -1, SQLITE_STATIC);
        sqlite3_step(stmt);
        sqlite3_reset(stmt);
    }
    sqlite3_finalize(stmt);
    sqlite3_exec(db, "COMMIT", NULL, NULL, NULL);
    printf("Inserted %d rows in %.0f ms\n\n", ROWS, now_ms() - t0);

    /* Test the function */
    sqlite3_stmt *q;
    sqlite3_prepare_v2(db, "SELECT fuzzy_score('Alice Smith', 'ali')", -1, &q, NULL);
    sqlite3_step(q);
    printf("fuzzy_score('Alice Smith', 'ali')    = %.0f\n", sqlite3_column_double(q, 0));
    sqlite3_finalize(q);

    sqlite3_prepare_v2(db, "SELECT fuzzy_score('Bob Jones', 'ali')", -1, &q, NULL);
    sqlite3_step(q);
    printf("fuzzy_score('Bob Jones', 'ali')      = %.0f\n", sqlite3_column_double(q, 0));
    sqlite3_finalize(q);

    sqlite3_prepare_v2(db, "SELECT fuzzy_score('Frank Moore', 'frank m')", -1, &q, NULL);
    sqlite3_step(q);
    printf("fuzzy_score('Frank Moore', 'frank m') = %.0f\n\n", sqlite3_column_double(q, 0));
    sqlite3_finalize(q);

    /* Benchmark: fuzzy search */
    const char *queries[] = {"ali", "frank m", "charlie b"};
    const char *labels[] = {"Short query", "Multi-word", "Partial name"};

    printf("=== Benchmark: fuzzy_score on %d rows ===\n\n", ROWS);

    for (int qi = 0; qi < 3; qi++) {
        const char *query = queries[qi];

        /* Warm up */
        sqlite3_prepare_v2(db,
            "SELECT name, city, fuzzy_score(name, ?) as score "
            "FROM users WHERE fuzzy_score(name, ?) > 0 "
            "ORDER BY score DESC LIMIT 5",
            -1, &q, NULL);
        sqlite3_bind_text(q, 1, query, -1, SQLITE_STATIC);
        sqlite3_bind_text(q, 2, query, -1, SQLITE_STATIC);
        while (sqlite3_step(q) == SQLITE_ROW) {}
        sqlite3_finalize(q);

        /* Benchmark */
        int ITERS = 20;
        t0 = now_ms();
        for (int iter = 0; iter < ITERS; iter++) {
            sqlite3_prepare_v2(db,
                "SELECT name, city, fuzzy_score(name, ?) as score "
                "FROM users WHERE fuzzy_score(name, ?) > 0 "
                "ORDER BY score DESC LIMIT 5",
                -1, &q, NULL);
            sqlite3_bind_text(q, 1, query, -1, SQLITE_STATIC);
            sqlite3_bind_text(q, 2, query, -1, SQLITE_STATIC);

            char top_name[64] = {0};
            double top_score = 0;
            while (sqlite3_step(q) == SQLITE_ROW) {
                if (top_name[0] == 0) {
                    strncpy(top_name, (const char *)sqlite3_column_text(q, 0), 63);
                    top_score = sqlite3_column_double(q, 2);
                }
            }
            sqlite3_finalize(q);
        }
        double elapsed = (now_ms() - t0) / ITERS;

        printf("  '%s' (%s)\n", query, labels[qi]);
        printf("    %.1f ms/query  |  %d rows/sec\n\n",
               elapsed, (int)(ROWS / elapsed * 1000));
    }

    /* Count total matches for throughput */
    t0 = now_ms();
    sqlite3_prepare_v2(db,
        "SELECT COUNT(*), AVG(fuzzy_score(name, 'ali')) FROM users",
        -1, &q, NULL);
    sqlite3_step(q);
    int total = sqlite3_column_int(q, 0);
    double avg = sqlite3_column_double(q, 1);
    double scan_ms = now_ms() - t0;
    sqlite3_finalize(q);

    printf("  Full table scan: fuzzy_score on %d rows\n", total);
    printf("    %.1f ms  |  avg score: %.1f  |  %d rows/sec\n",
           scan_ms, avg, (int)(total / scan_ms * 1000));

    sqlite3_close(db);
    return 0;
}
