#ifndef TSN_RUNTIME_FETCH_H
#define TSN_RUNTIME_FETCH_H

#include <curl/curl.h>

/* ─── Hosted Fetch (libcurl + libuv worker pool) ──────────────────
 *
 * Narrow fetch v1:
 * - fetch(url) defaults to GET
 * - fetch(url, { method, body, headers }) supports simple request shaping
 * - Response is a plain runtime value with status/ok/body plus raw headers
 *
 * Still pending:
 * - streaming bodies
 * - redirects/cookies/cache policy control
 * - AbortController / cancellation
 * - Response.json() and richer metadata
 */

typedef struct {
    double status;
    bool ok;
    Str body;
    Str headers;
} TSFetchResponse;

typedef struct {
    uv_work_t work;
    TSPromiseState *promise;
    char *url;
    char *method;
    char *body;
    char *request_headers;
    size_t body_len;
    char *response_body;
    size_t response_len;
    char *response_headers;
    size_t response_headers_len;
    long status_code;
    CURLcode curl_code;
    char error[CURL_ERROR_SIZE];
    struct curl_slist *curl_headers;
} TSFetchAsyncReq;

static inline void ts_fetch_runtime_init(void) {
    static bool ready = false;
    if (!ready) {
        if (curl_global_init(CURL_GLOBAL_DEFAULT) != CURLE_OK) {
            ts_runtime_fatal("fetch runtime failed to initialize libcurl");
        }
        ready = true;
    }
}

static size_t ts_fetch_write_cb(char *ptr, size_t size, size_t nmemb, void *userdata) {
    TSFetchAsyncReq *req = (TSFetchAsyncReq *)userdata;
    size_t bytes = size * nmemb;
    char *next = (char *)realloc(req->response_body, req->response_len + bytes + 1);
    if (next == NULL) return 0;
    req->response_body = next;
    memcpy(req->response_body + req->response_len, ptr, bytes);
    req->response_len += bytes;
    req->response_body[req->response_len] = '\0';
    return bytes;
}

static size_t ts_fetch_header_cb(char *ptr, size_t size, size_t nmemb, void *userdata) {
    TSFetchAsyncReq *req = (TSFetchAsyncReq *)userdata;
    size_t bytes = size * nmemb;
    char *next = (char *)realloc(req->response_headers, req->response_headers_len + bytes + 1);
    if (next == NULL) return 0;
    req->response_headers = next;
    memcpy(req->response_headers + req->response_headers_len, ptr, bytes);
    req->response_headers_len += bytes;
    req->response_headers[req->response_headers_len] = '\0';
    return bytes;
}

static inline void ts_fetch_apply_headers(CURL *curl, TSFetchAsyncReq *req) {
    if (req->request_headers == NULL || req->request_headers[0] == '\0') return;
    char *cursor = req->request_headers;
    while (*cursor != '\0') {
        char *line = cursor;
        char *newline = strchr(cursor, '\n');
        if (newline != NULL) {
            *newline = '\0';
            cursor = newline + 1;
        } else {
            cursor += strlen(cursor);
        }
        size_t len = strlen(line);
        while (len > 0 && (line[len - 1] == '\r' || line[len - 1] == '\n')) {
            line[--len] = '\0';
        }
        if (len == 0) continue;
        req->curl_headers = curl_slist_append(req->curl_headers, line);
        if (req->curl_headers == NULL) {
            snprintf(req->error, sizeof(req->error), "fetch failed to allocate request headers");
            req->curl_code = CURLE_OUT_OF_MEMORY;
            return;
        }
    }
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, req->curl_headers);
}

static void ts_async_fetch_work(uv_work_t *work) {
    TSFetchAsyncReq *req = (TSFetchAsyncReq *)work->data;
    ts_fetch_runtime_init();

    CURL *curl = curl_easy_init();
    if (curl == NULL) {
        req->curl_code = CURLE_FAILED_INIT;
        snprintf(req->error, sizeof(req->error), "curl_easy_init failed");
        return;
    }

    curl_easy_setopt(curl, CURLOPT_URL, req->url);
    curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
    curl_easy_setopt(curl, CURLOPT_NOSIGNAL, 1L);
    curl_easy_setopt(curl, CURLOPT_CONNECTTIMEOUT_MS, 2000L);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT_MS, 5000L);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, ts_fetch_write_cb);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, req);
    curl_easy_setopt(curl, CURLOPT_HEADERFUNCTION, ts_fetch_header_cb);
    curl_easy_setopt(curl, CURLOPT_HEADERDATA, req);
    curl_easy_setopt(curl, CURLOPT_ERRORBUFFER, req->error);
    ts_fetch_apply_headers(curl, req);
    if (req->curl_code == CURLE_OUT_OF_MEMORY) {
        curl_easy_cleanup(curl);
        return;
    }

    if (strcmp(req->method, "GET") != 0) {
      if (strcmp(req->method, "POST") == 0) {
          curl_easy_setopt(curl, CURLOPT_POST, 1L);
      } else {
          curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, req->method);
      }
      if (req->body != NULL) {
          curl_easy_setopt(curl, CURLOPT_POSTFIELDS, req->body);
          curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, (long)req->body_len);
      }
    }

    req->curl_code = curl_easy_perform(curl);
    if (req->curl_code == CURLE_OK) {
        curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &req->status_code);
    } else if (req->error[0] == '\0') {
        snprintf(req->error, sizeof(req->error), "%s", curl_easy_strerror(req->curl_code));
    }

    curl_easy_cleanup(curl);
}

static void ts_async_fetch_done(uv_work_t *work, int status) {
    TSFetchAsyncReq *req = (TSFetchAsyncReq *)work->data;
    if (status < 0) {
        ts_promise_rejectf(req->promise, "fetch failed in libuv: %s", uv_strerror(status));
    } else if (req->curl_code != CURLE_OK) {
        ts_promise_reject_raw(req->promise, str_rc_new(req->error, (int)strlen(req->error)));
    } else {
        TSFetchResponse response;
        response.status = (double)req->status_code;
        response.ok = req->status_code >= 200 && req->status_code < 300;
        if (req->response_body != NULL) {
            response.body = str_rc_new(req->response_body, (int)req->response_len);
        } else {
            response.body = str_lit("");
        }
        if (req->response_headers != NULL) {
            response.headers = str_rc_new(req->response_headers, (int)req->response_headers_len);
        } else {
            response.headers = str_lit("");
        }
        ts_promise_resolve_raw(req->promise, &response, sizeof(TSFetchResponse));
    }

    free(req->url);
    free(req->method);
    free(req->body);
    free(req->request_headers);
    free(req->response_body);
    free(req->response_headers);
    if (req->curl_headers != NULL) curl_slist_free_all(req->curl_headers);
    free(req);
}

static inline bool ts_fetch_header_name_eq(const char *a, const char *b, size_t len) {
    for (size_t i = 0; i < len; i++) {
        char ca = a[i];
        char cb = b[i];
        if (ca >= 'A' && ca <= 'Z') ca = (char)(ca - 'A' + 'a');
        if (cb >= 'A' && cb <= 'Z') cb = (char)(cb - 'A' + 'a');
        if (ca != cb) return false;
    }
    return b[len] == '\0';
}

static inline Str ts_fetch_status_text(double status) {
    int code = (int)status;
    switch (code) {
        case 200: return str_lit("OK");
        case 201: return str_lit("Created");
        case 202: return str_lit("Accepted");
        case 204: return str_lit("No Content");
        case 304: return str_lit("Not Modified");
        case 400: return str_lit("Bad Request");
        case 401: return str_lit("Unauthorized");
        case 403: return str_lit("Forbidden");
        case 404: return str_lit("Not Found");
        case 409: return str_lit("Conflict");
        case 422: return str_lit("Unprocessable Entity");
        case 429: return str_lit("Too Many Requests");
        case 500: return str_lit("Internal Server Error");
        case 502: return str_lit("Bad Gateway");
        case 503: return str_lit("Service Unavailable");
        default: return str_lit("");
    }
}

static inline Str ts_fetch_header(TSFetchResponse response, Str name) {
    if (response.headers.len == 0 || name.len == 0) return str_lit("");
    const char *cursor = response.headers.data;
    const char *end = response.headers.data + response.headers.len;
    while (cursor < end) {
        const char *line = cursor;
        const char *newline = memchr(cursor, '\n', (size_t)(end - cursor));
        const char *line_end = newline != NULL ? newline : end;
        const char *colon = memchr(line, ':', (size_t)(line_end - line));
        if (colon != NULL) {
            size_t key_len = (size_t)(colon - line);
            if (key_len == (size_t)name.len && ts_fetch_header_name_eq(line, name.data, key_len)) {
                const char *value = colon + 1;
                while (value < line_end && (*value == ' ' || *value == '\t')) value++;
                const char *value_end = line_end;
                while (value_end > value && (value_end[-1] == '\r' || value_end[-1] == '\n' || value_end[-1] == ' ')) value_end--;
                return str_rc_new(value, (int)(value_end - value));
            }
        }
        cursor = newline != NULL ? newline + 1 : end;
    }
    return str_lit("");
}

static inline void ts_schedule_fetch(TSPromiseState *promise, Str url, Str method, Str body, Str headers) {
    TSFetchAsyncReq *req = (TSFetchAsyncReq *)malloc(sizeof(TSFetchAsyncReq));
    if (req == NULL) {
        ts_promise_reject_cstr(promise, "fetch failed: out of memory");
        return;
    }
    memset(req, 0, sizeof(TSFetchAsyncReq));
    req->promise = promise;
    req->url = ts_owned_cstr(url);
    req->method = ts_owned_cstr(method);
    req->body = body.len > 0 ? ts_owned_cstr(body) : NULL;
    req->request_headers = headers.len > 0 ? ts_owned_cstr(headers) : NULL;
    if (req->url == NULL || req->method == NULL || (body.len > 0 && req->body == NULL) || (headers.len > 0 && req->request_headers == NULL)) {
        free(req->url);
        free(req->method);
        free(req->body);
        free(req->request_headers);
        free(req);
        ts_promise_reject_cstr(promise, "fetch failed: out of memory");
        return;
    }
    req->body_len = (size_t)body.len;
    req->work.data = req;
    int rc = uv_queue_work(ts_uv_loop(), &req->work, ts_async_fetch_work, ts_async_fetch_done);
    if (rc != 0) {
        free(req->url);
        free(req->method);
        free(req->body);
        free(req->request_headers);
        free(req);
        ts_promise_rejectf(promise, "fetch failed in libuv: %s", uv_strerror(rc));
    }
}

#endif /* TSN_RUNTIME_FETCH_H */
