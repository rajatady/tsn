/*
 * Hand-optimized JSON Pipeline in C.
 * Same logic as targets/json-pipeline.ts.
 *
 * Uses a fast custom JSON parser (no allocations for field names),
 * stack arrays where possible, and minimal heap usage.
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <math.h>

typedef struct {
    char name[64];
    int age;
    char city[32];
    double score;
    bool active;
} Person;

typedef struct {
    char name[64];
    char city[32];
    double score;
    int rank;
} Result;

typedef struct {
    char city[32];
    int count;
    double total_score;
    double avg_score;
} CityStats;

/* ─── Fast JSON parser ─────────────────────────────────────────── */

static inline int skip_ws(const char *s, int p) {
    while (s[p]==' '||s[p]=='\t'||s[p]=='\n'||s[p]=='\r') p++;
    return p;
}

static int parse_json_string(const char *s, int p, char *out, int max) {
    p++; /* skip " */
    int i = 0;
    while (s[p] != '"' && i < max - 1) out[i++] = s[p++];
    out[i] = '\0';
    return p + 1;
}

static int parse_json_number(const char *s, int p, double *out) {
    char *end;
    *out = strtod(s + p, &end);
    return (int)(end - s);
}

static int parse_person_array(const char *s, Person **out) {
    int cap = 1024, len = 0;
    *out = (Person *)malloc(cap * sizeof(Person));
    int p = skip_ws(s, 0);
    if (s[p] != '[') return 0;
    p++;

    while (1) {
        p = skip_ws(s, p);
        if (s[p] == ']') break;
        if (s[p] == ',') { p++; continue; }
        if (s[p] != '{') break;
        p++;

        if (len >= cap) {
            cap *= 2;
            *out = (Person *)realloc(*out, cap * sizeof(Person));
        }
        Person *person = &(*out)[len];
        memset(person, 0, sizeof(Person));

        while (1) {
            p = skip_ws(s, p);
            if (s[p] == '}') { p++; break; }
            if (s[p] == ',') { p++; continue; }

            char key[64];
            p = parse_json_string(s, p, key, 64);
            p = skip_ws(s, p);
            p++; /* skip : */
            p = skip_ws(s, p);

            if (strcmp(key, "name") == 0)       p = parse_json_string(s, p, person->name, 64);
            else if (strcmp(key, "city") == 0)   p = parse_json_string(s, p, person->city, 32);
            else if (strcmp(key, "age") == 0)    { double v; p = parse_json_number(s, p, &v); person->age = (int)v; }
            else if (strcmp(key, "score") == 0)  p = parse_json_number(s, p, &person->score);
            else if (strcmp(key, "active") == 0) {
                if (strncmp(s + p, "true", 4) == 0) { person->active = true; p += 4; }
                else { person->active = false; p += 5; }
            } else {
                /* skip unknown value */
                if (s[p] == '"') { char tmp[256]; p = parse_json_string(s, p, tmp, 256); }
                else if (s[p]=='t'||s[p]=='f') { p += (s[p]=='t' ? 4 : 5); }
                else { double tmp; p = parse_json_number(s, p, &tmp); }
            }
        }
        len++;
    }
    return len;
}

/* ─── Pipeline ─────────────────────────────────────────────────── */

static int cmp_score_desc(const void *a, const void *b) {
    double sa = ((const Person *)a)->score;
    double sb = ((const Person *)b)->score;
    if (sb > sa) return 1;
    if (sb < sa) return -1;
    return 0;
}

int main(void) {
    /* Read stdin */
    size_t cap = 65536, len = 0;
    char *input = (char *)malloc(cap);
    size_t n;
    while ((n = fread(input + len, 1, cap - len, stdin)) > 0) {
        len += n;
        if (len == cap) { cap *= 2; input = (char *)realloc(input, cap); }
    }
    input[len] = '\0';

    /* Parse */
    Person *data;
    int data_len = parse_person_array(input, &data);
    free(input);

    /* Filter: active first, then age >= 25 (matches TS pipeline order) */
    Person *active = (Person *)malloc(data_len * sizeof(Person));
    int alen = 0;
    for (int i = 0; i < data_len; i++) {
        if (data[i].active) active[alen++] = data[i];
    }
    Person *filtered = (Person *)malloc(alen * sizeof(Person));
    int flen = 0;
    for (int i = 0; i < alen; i++) {
        if (active[i].age >= 25) filtered[flen++] = active[i];
    }

    /* Sort by score descending */
    qsort(filtered, flen, sizeof(Person), cmp_score_desc);

    /* Top 10 */
    printf("=== TOP 10 RESULTS ===\n");
    int top = flen < 10 ? flen : 10;
    for (int i = 0; i < top; i++) {
        printf("#%d %s (%s) — score: %g\n", i + 1, filtered[i].name, filtered[i].city, filtered[i].score);
    }

    /* City aggregation */
    CityStats cities[64];
    int ncities = 0;
    for (int i = 0; i < flen; i++) {
        int found = -1;
        for (int j = 0; j < ncities; j++) {
            if (strcmp(cities[j].city, filtered[i].city) == 0) { found = j; }
        }
        if (found == -1) {
            strcpy(cities[ncities].city, filtered[i].city);
            cities[ncities].count = 1;
            cities[ncities].total_score = filtered[i].score;
            ncities++;
        } else {
            cities[found].count++;
            cities[found].total_score += filtered[i].score;
        }
    }
    printf("\n=== CITY STATS ===\n");
    for (int i = 0; i < ncities; i++) {
        cities[i].avg_score = round(cities[i].total_score / cities[i].count * 100) / 100;
        printf("%s: %d people, avg score: %g\n", cities[i].city, cities[i].count, cities[i].avg_score);
    }

    printf("\nTotal processed: %d\n", data_len);
    printf("Active: %d\n", alen);
    printf("Age >= 25: %d\n", flen);

    free(data);
    free(filtered);
    return 0;
}
