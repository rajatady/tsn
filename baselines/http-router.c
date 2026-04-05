/*
 * Hand-optimized HTTP Router in C.
 * Same logic as targets/http-router.ts but written the way a C programmer would.
 *
 * Key differences from compiler output:
 *   - Stack-allocated buffers for string building (no heap alloc in loops)
 *   - Direct char comparisons (no string objects for single chars)
 *   - Fixed-size structs, no dynamic arrays for small collections
 *   - Zero heap allocation in the hot benchmark loop
 */

#include <stdio.h>
#include <string.h>
#include <stdbool.h>

#define MAX_PARAMS 8
#define MAX_QUERY 8
#define MAX_PARTS 16
#define MAX_ROUTES 16
#define BUF_SIZE 256

typedef struct { char key[BUF_SIZE]; char value[BUF_SIZE]; } QueryParam;
typedef struct { char method[16]; char path[BUF_SIZE]; QueryParam query[MAX_QUERY]; int query_count; } ParsedRequest;
typedef struct { char method[16]; char pattern[BUF_SIZE]; char handler[64]; } Route;
typedef struct { int status; char handler[64]; char params[MAX_PARAMS][64]; char param_values[MAX_PARAMS][BUF_SIZE]; int param_count; QueryParam query[MAX_QUERY]; int query_count; } Response;

/* ─── Parse query string (stack only, zero alloc) ──────────────── */

static int parse_query_string(const char *qs, int qs_len, QueryParam *out) {
    int count = 0;
    int i = 0;
    while (i < qs_len && count < MAX_QUERY) {
        int key_start = i;
        while (i < qs_len && qs[i] != '=' && qs[i] != '&') i++;
        int key_end = i;
        int val_start = i, val_end = i;
        if (i < qs_len && qs[i] == '=') {
            i++;
            val_start = i;
            while (i < qs_len && qs[i] != '&') i++;
            val_end = i;
        }
        if (key_end > key_start) {
            memcpy(out[count].key, qs + key_start, key_end - key_start);
            out[count].key[key_end - key_start] = '\0';
            memcpy(out[count].value, qs + val_start, val_end - val_start);
            out[count].value[val_end - val_start] = '\0';
            count++;
        }
        if (i < qs_len && qs[i] == '&') i++;
    }
    return count;
}

/* ─── Parse request line (stack only) ──────────────────────────── */

static ParsedRequest parse_request(const char *line) {
    ParsedRequest req = {0};
    const char *sp = strchr(line, ' ');
    if (!sp) return req;
    int mlen = (int)(sp - line);
    memcpy(req.method, line, mlen);
    req.method[mlen] = '\0';

    const char *path_start = sp + 1;
    const char *q = strchr(path_start, '?');
    if (q) {
        int plen = (int)(q - path_start);
        memcpy(req.path, path_start, plen);
        req.path[plen] = '\0';
        req.query_count = parse_query_string(q + 1, (int)strlen(q + 1), req.query);
    } else {
        strcpy(req.path, path_start);
    }
    return req;
}

/* ─── Split path into parts (stack buffer) ─────────────────────── */

static int split_path(const char *path, char parts[][BUF_SIZE]) {
    int count = 0;
    int i = 0, len = (int)strlen(path);
    while (i < len && count < MAX_PARTS) {
        if (path[i] == '/') { i++; continue; }
        int start = i;
        while (i < len && path[i] != '/') i++;
        int plen = i - start;
        memcpy(parts[count], path + start, plen);
        parts[count][plen] = '\0';
        count++;
    }
    return count;
}

/* ─── Route matching (zero alloc) ──────────────────────────────── */

static Response find_route(Route *routes, int nroutes, ParsedRequest *req) {
    Response resp;
    char pat_parts[MAX_PARTS][BUF_SIZE];
    char req_parts[MAX_PARTS][BUF_SIZE];
    int req_nparts = split_path(req->path, req_parts);

    for (int r = 0; r < nroutes; r++) {
        if (strcmp(routes[r].method, req->method) != 0) continue;
        int pat_nparts = split_path(routes[r].pattern, pat_parts);
        if (pat_nparts != req_nparts) continue;

        resp.param_count = 0;
        bool matched = true;
        for (int p = 0; p < pat_nparts; p++) {
            if (pat_parts[p][0] == ':') {
                strcpy(resp.params[resp.param_count], pat_parts[p] + 1);
                strcpy(resp.param_values[resp.param_count], req_parts[p]);
                resp.param_count++;
            } else if (strcmp(pat_parts[p], req_parts[p]) != 0) {
                matched = false;
                break;
            }
        }
        if (matched) {
            resp.status = 200;
            strcpy(resp.handler, routes[r].handler);
            memcpy(resp.query, req->query, sizeof(QueryParam) * req->query_count);
            resp.query_count = req->query_count;
            return resp;
        }
    }
    resp.status = 404;
    strcpy(resp.handler, "none");
    resp.param_count = 0;
    resp.query_count = 0;
    return resp;
}

/* ─── Format response (stack buffer) ───────────────────────────── */

static void format_response(Response *resp, char *out) {
    int pos = sprintf(out, "HTTP %d | handler: %s", resp->status, resp->handler);
    if (resp->param_count > 0) {
        pos += sprintf(out + pos, " | params: ");
        for (int i = 0; i < resp->param_count; i++) {
            if (i > 0) pos += sprintf(out + pos, ", ");
            pos += sprintf(out + pos, "%s=%s", resp->params[i], resp->param_values[i]);
        }
    }
    if (resp->query_count > 0) {
        pos += sprintf(out + pos, " | query: ");
        for (int i = 0; i < resp->query_count; i++) {
            if (i > 0) pos += sprintf(out + pos, ", ");
            pos += sprintf(out + pos, "%s=%s", resp->query[i].key, resp->query[i].value);
        }
    }
}

int main(void) {
    Route routes[] = {
        {"GET",  "/",                    "home"},
        {"GET",  "/users",               "listUsers"},
        {"GET",  "/users/:id",           "getUser"},
        {"GET",  "/users/:id/posts",     "getUserPosts"},
        {"POST", "/users",               "createUser"},
        {"GET",  "/users/:id/posts/:postId", "getPost"},
        {"GET",  "/search",              "search"},
        {"GET",  "/api/v1/health",       "healthCheck"},
    };
    int nroutes = 8;

    const char *requests[] = {
        "GET /", "GET /users", "GET /users/42", "GET /users/42/posts",
        "GET /users/42/posts/7", "POST /users",
        "GET /search?q=hello&page=2&limit=20", "GET /api/v1/health",
        "GET /nonexistent", "DELETE /users/1",
        "GET /users/99/posts?sort=date&order=desc",
    };
    int nrequests = 11;

    printf("=== HTTP ROUTER TEST ===\n\n");
    char buf[2048];
    for (int i = 0; i < nrequests; i++) {
        ParsedRequest req = parse_request(requests[i]);
        Response resp = find_route(routes, nroutes, &req);
        format_response(&resp, buf);
        printf("REQ: %s\nRES: %s\n\n", requests[i], buf);
    }

    /* Benchmark: 100K matches — ZERO heap allocation */
    int total = 100000;
    int matched = 0;
    for (int k = 0; k < total; k++) {
        int idx = k % nrequests;
        ParsedRequest req = parse_request(requests[idx]);
        Response resp = find_route(routes, nroutes, &req);
        if (resp.status == 200) matched++;
    }
    printf("Benchmark: %d route matches, %d matched\n", total, matched);
    return 0;
}
