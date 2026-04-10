#ifndef TSN_RUNTIME_FETCH_H
#define TSN_RUNTIME_FETCH_H

#include <curl/curl.h>

/* ─── Hosted Fetch (libcurl + libuv worker pool) ──────────────────
 *
 * Narrow fetch v1:
 * - fetch(url) defaults to GET
 * - fetch(url, { method, body }) supports simple request shaping
 * - Response is a plain runtime value with status/ok/body
 *
 * Still pending:
 * - headers
 * - streaming bodies
 * - redirects/cookies/cache policy control
 * - AbortController / cancellation
 * - Response.json(), statusText, and richer metadata
 */

typedef struct {
    double status;
    bool ok;
    Str body;
} TSFetchResponse;

typedef struct {
    uv_work_t work;
    TSPromiseState *promise;
    char *url;
    char *method;
    char *body;
    size_t body_len;
    char *response_body;
    size_t response_len;
    long status_code;
    CURLcode curl_code;
    char error[CURL_ERROR_SIZE];
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
    curl_easy_setopt(curl, CURLOPT_ERRORBUFFER, req->error);

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
        ts_promise_resolve_raw(req->promise, &response, sizeof(TSFetchResponse));
    }

    free(req->url);
    free(req->method);
    free(req->body);
    free(req->response_body);
    free(req);
}

static inline void ts_schedule_fetch(TSPromiseState *promise, Str url, Str method, Str body) {
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
    if (req->url == NULL || req->method == NULL || (body.len > 0 && req->body == NULL)) {
        free(req->url);
        free(req->method);
        free(req->body);
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
        free(req);
        ts_promise_rejectf(promise, "fetch failed in libuv: %s", uv_strerror(rc));
    }
}

#endif /* TSN_RUNTIME_FETCH_H */
