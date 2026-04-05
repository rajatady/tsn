#define main strictts_generated_http_router_main
#include "../build/http-router.c"
#undef main

#include "http-server-common.h"

static __thread RouteArr g_routes;
static __thread bool g_routes_ready = false;

static void init_routes(void) {
    if (g_routes_ready) return;
    g_routes = RouteArr_new();

    StrArr parts = splitPath(str_lit("/"));
    StrArr paramNames = collectParamNames(parts);
    RouteArr_push(&g_routes, (Route){ .method = str_retain(str_lit("GET")), .handler = str_retain(str_lit("home")), .parts = StrArr_retain(parts), .paramNames = StrArr_retain(paramNames) });
    StrArr_release_deep(&parts);
    StrArr_release_deep(&paramNames);

    parts = splitPath(str_lit("/users"));
    paramNames = collectParamNames(parts);
    RouteArr_push(&g_routes, (Route){ .method = str_retain(str_lit("GET")), .handler = str_retain(str_lit("listUsers")), .parts = StrArr_retain(parts), .paramNames = StrArr_retain(paramNames) });
    StrArr_release_deep(&parts);
    StrArr_release_deep(&paramNames);

    parts = splitPath(str_lit("/users/:id"));
    paramNames = collectParamNames(parts);
    RouteArr_push(&g_routes, (Route){ .method = str_retain(str_lit("GET")), .handler = str_retain(str_lit("getUser")), .parts = StrArr_retain(parts), .paramNames = StrArr_retain(paramNames) });
    StrArr_release_deep(&parts);
    StrArr_release_deep(&paramNames);

    parts = splitPath(str_lit("/users/:id/posts"));
    paramNames = collectParamNames(parts);
    RouteArr_push(&g_routes, (Route){ .method = str_retain(str_lit("GET")), .handler = str_retain(str_lit("getUserPosts")), .parts = StrArr_retain(parts), .paramNames = StrArr_retain(paramNames) });
    StrArr_release_deep(&parts);
    StrArr_release_deep(&paramNames);

    parts = splitPath(str_lit("/users"));
    paramNames = collectParamNames(parts);
    RouteArr_push(&g_routes, (Route){ .method = str_retain(str_lit("POST")), .handler = str_retain(str_lit("createUser")), .parts = StrArr_retain(parts), .paramNames = StrArr_retain(paramNames) });
    StrArr_release_deep(&parts);
    StrArr_release_deep(&paramNames);

    parts = splitPath(str_lit("/users/:id/posts/:postId"));
    paramNames = collectParamNames(parts);
    RouteArr_push(&g_routes, (Route){ .method = str_retain(str_lit("GET")), .handler = str_retain(str_lit("getPost")), .parts = StrArr_retain(parts), .paramNames = StrArr_retain(paramNames) });
    StrArr_release_deep(&parts);
    StrArr_release_deep(&paramNames);

    parts = splitPath(str_lit("/search"));
    paramNames = collectParamNames(parts);
    RouteArr_push(&g_routes, (Route){ .method = str_retain(str_lit("GET")), .handler = str_retain(str_lit("search")), .parts = StrArr_retain(parts), .paramNames = StrArr_retain(paramNames) });
    StrArr_release_deep(&parts);
    StrArr_release_deep(&paramNames);

    parts = splitPath(str_lit("/api/v1/health"));
    paramNames = collectParamNames(parts);
    RouteArr_push(&g_routes, (Route){ .method = str_retain(str_lit("GET")), .handler = str_retain(str_lit("healthCheck")), .parts = StrArr_retain(parts), .paramNames = StrArr_retain(paramNames) });
    StrArr_release_deep(&parts);
    StrArr_release_deep(&paramNames);

    g_routes_ready = true;
}

static void release_query_params(QueryParamArr *arr) {
    if (!arr->data) return;
    RcHeader *h = rc_header(arr->data);
    if (h->rc <= 1) {
        for (int i = 0; i < arr->len; i++) {
            str_release(&arr->data[i].key);
            str_release(&arr->data[i].value);
        }
    }
    QueryParamArr_release(arr);
}

static StrArr split_path_view(const char *path, int path_len) {
    StrArr parts = StrArr_new();
    int i = 0;
    while (i < path_len) {
        while (i < path_len && path[i] == '/') i++;
        if (i >= path_len) break;
        int start = i;
        while (i < path_len && path[i] != '/') i++;
        StrArr_push(&parts, str_from(path + start, i - start));
    }
    return parts;
}

static QueryParamArr parse_query_view(const char *query, int query_len) {
    QueryParamArr params = QueryParamArr_new();
    int i = 0;
    while (i < query_len) {
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
            QueryParamArr_push(&params, (QueryParam){
                .key = str_from(query + key_start, key_end - key_start),
                .value = str_from(query + value_start, value_end - value_start),
            });
        }

        if (i < query_len && query[i] == '&') i++;
    }
    return params;
}

static ParsedRequest parse_request_view(const char *method, int method_len, const char *target, int target_len) {
    const char *query = memchr(target, '?', (size_t)target_len);
    int path_len = target_len;
    QueryParamArr query_params = QueryParamArr_new();
    if (query) {
        path_len = (int)(query - target);
        query_params = parse_query_view(query + 1, target_len - path_len - 1);
    }

    ParsedRequest req = {
        .method = str_from(method, method_len),
        .pathParts = split_path_view(target, path_len),
        .queryParams = query_params,
    };
    return req;
}

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

static void append_str(char *buf, int cap, int *pos, Str value) {
    append_bytes(buf, cap, pos, value.data, value.len);
}

static int write_response_body(const Response *resp, char *buf, int cap) {
    int pos = 0;
    append_cstr(buf, cap, &pos, resp->status == 200 ? "HTTP 200 | handler: " : "HTTP 404 | handler: ");
    append_str(buf, cap, &pos, resp->handler);

    if (resp->params.len > 0) {
        append_cstr(buf, cap, &pos, " | params: ");
        for (int i = 0; i < resp->params.len; i++) {
            if (i > 0) append_cstr(buf, cap, &pos, ", ");
            append_str(buf, cap, &pos, ARRAY_GET(resp->params, i, "resp.params", __FILE__, __LINE__));
            append_cstr(buf, cap, &pos, "=");
            append_str(buf, cap, &pos, ARRAY_GET(resp->paramValues, i, "resp.paramValues", __FILE__, __LINE__));
        }
    }

    if (resp->queryParams.len > 0) {
        append_cstr(buf, cap, &pos, " | query: ");
        for (int i = 0; i < resp->queryParams.len; i++) {
            if (i > 0) append_cstr(buf, cap, &pos, ", ");
            QueryParam param = ARRAY_GET(resp->queryParams, i, "resp.queryParams", __FILE__, __LINE__);
            append_str(buf, cap, &pos, param.key);
            append_cstr(buf, cap, &pos, "=");
            append_str(buf, cap, &pos, param.value);
        }
    }

    return pos;
}

static void strictts_http_handler(const char *method, int method_len, const char *target, int target_len, HttpResponse *out) {
    init_routes();
    ParsedRequest req = parse_request_view(method, method_len, target, target_len);
    Response resp = findRoute(g_routes, req);

    out->status = (int)resp.status;
    out->body_len = write_response_body(&resp, out->body, HTTP_BODY_CAP);

    StrArr_release_deep(&req.pathParts);
    release_query_params(&req.queryParams);
    StrArr_release_deep(&resp.params);
    StrArr_release_deep(&resp.paramValues);
    release_query_params(&resp.queryParams);
}

int main(void) {
    return run_http_server(strictts_http_handler);
}
