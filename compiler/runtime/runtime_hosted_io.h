#ifndef TSN_RUNTIME_HOSTED_IO_H
#define TSN_RUNTIME_HOSTED_IO_H

/* ─── File I/O ──────────────────────────────────────────────────── */

#include <dirent.h>
#include <sys/stat.h>
#include <sys/mman.h>
#include <fcntl.h>

static inline Str ts_readFile(Str path) {
    /* Null-terminate the path for C APIs */
    char pathbuf[4096];
    int plen = path.len < 4095 ? path.len : 4095;
    memcpy(pathbuf, path.data, plen);
    pathbuf[plen] = '\0';

    FILE *f = fopen(pathbuf, "rb");
    if (!f) return str_lit("");

    fseek(f, 0, SEEK_END);
    long sz = ftell(f);
    fseek(f, 0, SEEK_SET);

    char *buf = (char *)rc_alloc(sz + 1);
    fread(buf, 1, sz, f);
    buf[sz] = '\0';
    fclose(f);

    return (Str){ buf, buf, (int)sz, 0 };
}

static inline void ts_writeFile(Str path, Str content) {
    char pathbuf[4096];
    int plen = path.len < 4095 ? path.len : 4095;
    memcpy(pathbuf, path.data, plen);
    pathbuf[plen] = '\0';

    FILE *f = fopen(pathbuf, "wb");
    if (!f) return;
    fwrite(content.data, 1, content.len, f);
    fclose(f);
}

static inline void ts_appendFile(Str path, Str content) {
    char pathbuf[4096];
    int plen = path.len < 4095 ? path.len : 4095;
    memcpy(pathbuf, path.data, plen);
    pathbuf[plen] = '\0';

    FILE *f = fopen(pathbuf, "ab");
    if (!f) return;
    fwrite(content.data, 1, content.len, f);
    fclose(f);
}

static inline bool ts_fileExists(Str path) {
    char pathbuf[4096];
    int plen = path.len < 4095 ? path.len : 4095;
    memcpy(pathbuf, path.data, plen);
    pathbuf[plen] = '\0';
    struct stat st;
    return stat(pathbuf, &st) == 0;
}

static inline double ts_fileSize(Str path) {
    char pathbuf[4096];
    int plen = path.len < 4095 ? path.len : 4095;
    memcpy(pathbuf, path.data, plen);
    pathbuf[plen] = '\0';
    struct stat st;
    if (stat(pathbuf, &st) != 0) return -1;
    return (double)st.st_size;
}

static inline StrArr ts_listDir(Str path) {
    char pathbuf[4096];
    int plen = path.len < 4095 ? path.len : 4095;
    memcpy(pathbuf, path.data, plen);
    pathbuf[plen] = '\0';

    StrArr result = StrArr_new();
    DIR *d = opendir(pathbuf);
    if (!d) return result;

    struct dirent *ent;
    while ((ent = readdir(d)) != NULL) {
        if (ent->d_name[0] == '.') continue;
        int nlen = (int)strlen(ent->d_name);
        char *buf = (char *)rc_alloc(nlen + 1);
        memcpy(buf, ent->d_name, nlen);
        buf[nlen] = '\0';
        Str s = { buf, buf, nlen, 0 };
        StrArr_push(&result, s);
    }
    closedir(d);
    return result;
}

/* ─── Process execution ─────────────────────────────────────────── */

static inline double ts_exec(Str cmd) {
    char cmdbuf[8192];
    int clen = cmd.len < 8191 ? cmd.len : 8191;
    memcpy(cmdbuf, cmd.data, clen);
    cmdbuf[clen] = '\0';
    return (double)system(cmdbuf);
}

/* ─── Hosted Async Scheduling (libuv-backed) ───────────────────── */

static inline char *ts_owned_cstr(Str s) {
    char *buf = (char *)malloc((size_t)s.len + 1);
    memcpy(buf, s.data, s.len);
    buf[s.len] = '\0';
    return buf;
}

typedef struct {
    uv_work_t work;
    TSPromiseState *promise;
    char *path;
    Str result;
} TSReadFileAsyncReq;

typedef struct {
    uv_work_t work;
    TSPromiseState *promise;
    char *path;
    char *content;
    size_t content_len;
    bool append;
} TSWriteFileAsyncReq;

typedef struct {
    uv_work_t work;
    TSPromiseState *promise;
    char *path;
    bool result;
} TSFileExistsAsyncReq;

typedef struct {
    uv_work_t work;
    TSPromiseState *promise;
    char *path;
    double result;
} TSFileSizeAsyncReq;

typedef struct {
    uv_work_t work;
    TSPromiseState *promise;
    char *path;
    StrArr result;
} TSListDirAsyncReq;

typedef struct {
    uv_work_t work;
    TSPromiseState *promise;
    char *cmd;
    double result;
} TSExecAsyncReq;

static void ts_async_read_file_work(uv_work_t *work) {
    TSReadFileAsyncReq *req = (TSReadFileAsyncReq *)work->data;
    Str path = str_from(req->path, (int)strlen(req->path));
    req->result = ts_readFile(path);
}

static void ts_async_read_file_done(uv_work_t *work, int status) {
    TSReadFileAsyncReq *req = (TSReadFileAsyncReq *)work->data;
    (void)status;
    ts_promise_resolve_raw(req->promise, &req->result, sizeof(Str));
    free(req->path);
    free(req);
}

static inline void ts_schedule_read_file(TSPromiseState *promise, Str path) {
    TSReadFileAsyncReq *req = (TSReadFileAsyncReq *)malloc(sizeof(TSReadFileAsyncReq));
    memset(req, 0, sizeof(TSReadFileAsyncReq));
    req->promise = promise;
    req->path = ts_owned_cstr(path);
    req->work.data = req;
    uv_queue_work(ts_uv_loop(), &req->work, ts_async_read_file_work, ts_async_read_file_done);
}

static void ts_async_write_file_work(uv_work_t *work) {
    TSWriteFileAsyncReq *req = (TSWriteFileAsyncReq *)work->data;
    FILE *f = fopen(req->path, req->append ? "ab" : "wb");
    if (f) {
        fwrite(req->content, 1, req->content_len, f);
        fclose(f);
    }
}

static void ts_async_write_file_done(uv_work_t *work, int status) {
    TSWriteFileAsyncReq *req = (TSWriteFileAsyncReq *)work->data;
    (void)status;
    ts_promise_resolve_raw(req->promise, NULL, 0);
    free(req->path);
    free(req->content);
    free(req);
}

static inline void ts_schedule_write_file(TSPromiseState *promise, Str path, Str content, bool append) {
    TSWriteFileAsyncReq *req = (TSWriteFileAsyncReq *)malloc(sizeof(TSWriteFileAsyncReq));
    memset(req, 0, sizeof(TSWriteFileAsyncReq));
    req->promise = promise;
    req->path = ts_owned_cstr(path);
    req->content = ts_owned_cstr(content);
    req->content_len = (size_t)content.len;
    req->append = append;
    req->work.data = req;
    uv_queue_work(ts_uv_loop(), &req->work, ts_async_write_file_work, ts_async_write_file_done);
}

static void ts_async_file_exists_work(uv_work_t *work) {
    TSFileExistsAsyncReq *req = (TSFileExistsAsyncReq *)work->data;
    Str path = str_from(req->path, (int)strlen(req->path));
    req->result = ts_fileExists(path);
}

static void ts_async_file_exists_done(uv_work_t *work, int status) {
    TSFileExistsAsyncReq *req = (TSFileExistsAsyncReq *)work->data;
    (void)status;
    ts_promise_resolve_raw(req->promise, &req->result, sizeof(bool));
    free(req->path);
    free(req);
}

static inline void ts_schedule_file_exists(TSPromiseState *promise, Str path) {
    TSFileExistsAsyncReq *req = (TSFileExistsAsyncReq *)malloc(sizeof(TSFileExistsAsyncReq));
    memset(req, 0, sizeof(TSFileExistsAsyncReq));
    req->promise = promise;
    req->path = ts_owned_cstr(path);
    req->work.data = req;
    uv_queue_work(ts_uv_loop(), &req->work, ts_async_file_exists_work, ts_async_file_exists_done);
}

static void ts_async_file_size_work(uv_work_t *work) {
    TSFileSizeAsyncReq *req = (TSFileSizeAsyncReq *)work->data;
    Str path = str_from(req->path, (int)strlen(req->path));
    req->result = ts_fileSize(path);
}

static void ts_async_file_size_done(uv_work_t *work, int status) {
    TSFileSizeAsyncReq *req = (TSFileSizeAsyncReq *)work->data;
    (void)status;
    ts_promise_resolve_raw(req->promise, &req->result, sizeof(double));
    free(req->path);
    free(req);
}

static inline void ts_schedule_file_size(TSPromiseState *promise, Str path) {
    TSFileSizeAsyncReq *req = (TSFileSizeAsyncReq *)malloc(sizeof(TSFileSizeAsyncReq));
    memset(req, 0, sizeof(TSFileSizeAsyncReq));
    req->promise = promise;
    req->path = ts_owned_cstr(path);
    req->work.data = req;
    uv_queue_work(ts_uv_loop(), &req->work, ts_async_file_size_work, ts_async_file_size_done);
}

static void ts_async_list_dir_work(uv_work_t *work) {
    TSListDirAsyncReq *req = (TSListDirAsyncReq *)work->data;
    Str path = str_from(req->path, (int)strlen(req->path));
    req->result = ts_listDir(path);
}

static void ts_async_list_dir_done(uv_work_t *work, int status) {
    TSListDirAsyncReq *req = (TSListDirAsyncReq *)work->data;
    (void)status;
    ts_promise_resolve_raw(req->promise, &req->result, sizeof(StrArr));
    free(req->path);
    free(req);
}

static inline void ts_schedule_list_dir(TSPromiseState *promise, Str path) {
    TSListDirAsyncReq *req = (TSListDirAsyncReq *)malloc(sizeof(TSListDirAsyncReq));
    memset(req, 0, sizeof(TSListDirAsyncReq));
    req->promise = promise;
    req->path = ts_owned_cstr(path);
    req->work.data = req;
    uv_queue_work(ts_uv_loop(), &req->work, ts_async_list_dir_work, ts_async_list_dir_done);
}

static void ts_async_exec_work(uv_work_t *work) {
    TSExecAsyncReq *req = (TSExecAsyncReq *)work->data;
    Str cmd = str_from(req->cmd, (int)strlen(req->cmd));
    req->result = ts_exec(cmd);
}

static void ts_async_exec_done(uv_work_t *work, int status) {
    TSExecAsyncReq *req = (TSExecAsyncReq *)work->data;
    (void)status;
    ts_promise_resolve_raw(req->promise, &req->result, sizeof(double));
    free(req->cmd);
    free(req);
}

static inline void ts_schedule_exec(TSPromiseState *promise, Str cmd) {
    TSExecAsyncReq *req = (TSExecAsyncReq *)malloc(sizeof(TSExecAsyncReq));
    memset(req, 0, sizeof(TSExecAsyncReq));
    req->promise = promise;
    req->cmd = ts_owned_cstr(cmd);
    req->work.data = req;
    uv_queue_work(ts_uv_loop(), &req->work, ts_async_exec_work, ts_async_exec_done);
}

#endif /* TSN_RUNTIME_HOSTED_IO_H */
