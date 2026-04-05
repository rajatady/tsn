#include "../harness/http-server-common.h"

#define MAX_PARAMS 8
#define MAX_QUERY 8
#define MAX_PARTS 16

typedef struct {
    const char *data;
    int len;
} Slice;

typedef struct {
    Slice key;
    Slice value;
} QueryParamView;

typedef struct {
    const char *method;
    int method_len;
    const char *handler;
    Slice parts[MAX_PARTS];
    Slice param_names[MAX_PARAMS];
    int part_count;
    int param_count;
} Route;

static const Route ROUTES[] = {
    { "GET", 3, "home", {0}, {0}, 0, 0 },
    { "GET", 3, "listUsers", { {"users", 5} }, {0}, 1, 0 },
    { "GET", 3, "getUser", { {"users", 5}, {":id", 3} }, { {"id", 2} }, 2, 1 },
    { "GET", 3, "getUserPosts", { {"users", 5}, {":id", 3}, {"posts", 5} }, { {"id", 2} }, 3, 1 },
    { "POST", 4, "createUser", { {"users", 5} }, {0}, 1, 0 },
    { "GET", 3, "getPost", { {"users", 5}, {":id", 3}, {"posts", 5}, {":postId", 7} }, { {"id", 2}, {"postId", 6} }, 4, 2 },
    { "GET", 3, "search", { {"search", 6} }, {0}, 1, 0 },
    { "GET", 3, "healthCheck", { {"api", 3}, {"v1", 2}, {"health", 6} }, {0}, 3, 0 },
};

static void append_bytes(char *buf, int cap, int *pos, const char *src, int len) {
    if (*pos >= cap || len <= 0) return;
    int available = cap - *pos;
    int count = len < available ? len : available;
    memcpy(buf + *pos, src, (size_t)count);
    *pos += count;
}

static void append_cstr(char *buf, int cap, int *pos, const char *src) {
    append_bytes(buf, cap, pos, src, (int)strlen(src));
}

static void append_slice(char *buf, int cap, int *pos, Slice value) {
    append_bytes(buf, cap, pos, value.data, value.len);
}

static int split_path_view(const char *path, int path_len, Slice *parts) {
    int count = 0;
    int i = 0;
    while (i < path_len && count < MAX_PARTS) {
        while (i < path_len && path[i] == '/') i++;
        if (i >= path_len) break;
        int start = i;
        while (i < path_len && path[i] != '/') i++;
        parts[count++] = (Slice){ .data = path + start, .len = i - start };
    }
    return count;
}

static int parse_query_view(const char *query, int query_len, QueryParamView *out) {
    int count = 0;
    int i = 0;
    while (i < query_len && count < MAX_QUERY) {
        int key_start = i;
        while (i < query_len && query[i] != '=' && query[i] != '&') i++;
        int key_end = i;
        int value_start = i;
        int value_end = i;

        if (i < query_len && query[i] == '=') {
            i++;
            value_start = i;
            while (i < query_len && query[i] != '&') i++;
            value_end = i;
        }

        if (key_end > key_start) {
            out[count++] = (QueryParamView){
                .key = { .data = query + key_start, .len = key_end - key_start },
                .value = { .data = query + value_start, .len = value_end - value_start },
            };
        }

        if (i < query_len && query[i] == '&') i++;
    }
    return count;
}

static int slice_eq(Slice a, Slice b) {
    return a.len == b.len && (a.len == 0 || memcmp(a.data, b.data, (size_t)a.len) == 0);
}

static void baseline_http_handler(const char *method, int method_len, const char *target, int target_len, HttpResponse *out) {
    Slice parts[MAX_PARTS];
    Slice param_values[MAX_PARAMS];
    QueryParamView query_params[MAX_QUERY];

    const char *query = memchr(target, '?', (size_t)target_len);
    int path_len = query ? (int)(query - target) : target_len;
    int query_count = query ? parse_query_view(query + 1, target_len - path_len - 1, query_params) : 0;
    int part_count = split_path_view(target, path_len, parts);

    const Route *match = NULL;
    int matched_param_count = 0;

    for (int r = 0; r < (int)(sizeof(ROUTES) / sizeof(ROUTES[0])); r++) {
        const Route *route = &ROUTES[r];
        if (method_len != route->method_len || memcmp(method, route->method, (size_t)method_len) != 0) continue;
        if (part_count != route->part_count) continue;

        int param_index = 0;
        int matched = 1;
        for (int p = 0; p < route->part_count; p++) {
            Slice pattern = route->parts[p];
            if (pattern.len > 0 && pattern.data[0] == ':') {
                if (param_index < MAX_PARAMS) param_values[param_index++] = parts[p];
                continue;
            }
            if (!slice_eq(pattern, parts[p])) {
                matched = 0;
                break;
            }
        }
        if (matched) {
            match = route;
            matched_param_count = param_index;
            break;
        }
    }

    int pos = 0;
    if (!match) {
        out->status = 404;
        append_cstr(out->body, HTTP_BODY_CAP, &pos, "HTTP 404 | handler: none");
        out->body_len = pos;
        return;
    }

    out->status = 200;
    append_cstr(out->body, HTTP_BODY_CAP, &pos, "HTTP 200 | handler: ");
    append_cstr(out->body, HTTP_BODY_CAP, &pos, match->handler);

    if (matched_param_count > 0) {
        append_cstr(out->body, HTTP_BODY_CAP, &pos, " | params: ");
        for (int i = 0; i < matched_param_count; i++) {
            if (i > 0) append_cstr(out->body, HTTP_BODY_CAP, &pos, ", ");
            append_slice(out->body, HTTP_BODY_CAP, &pos, match->param_names[i]);
            append_cstr(out->body, HTTP_BODY_CAP, &pos, "=");
            append_slice(out->body, HTTP_BODY_CAP, &pos, param_values[i]);
        }
    }

    if (query_count > 0) {
        append_cstr(out->body, HTTP_BODY_CAP, &pos, " | query: ");
        for (int i = 0; i < query_count; i++) {
            if (i > 0) append_cstr(out->body, HTTP_BODY_CAP, &pos, ", ");
            append_slice(out->body, HTTP_BODY_CAP, &pos, query_params[i].key);
            append_cstr(out->body, HTTP_BODY_CAP, &pos, "=");
            append_slice(out->body, HTTP_BODY_CAP, &pos, query_params[i].value);
        }
    }

    out->body_len = pos;
}

int main(void) {
    return run_http_server(baseline_http_handler);
}
