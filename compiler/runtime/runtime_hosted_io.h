#ifndef TSN_RUNTIME_HOSTED_IO_H
#define TSN_RUNTIME_HOSTED_IO_H

/* ─── File I/O ──────────────────────────────────────────────────── */

#include <dirent.h>
#include <errno.h>
#include <fcntl.h>
#include <sys/mman.h>
#include <sys/stat.h>

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
    if (buf == NULL) return NULL;
    memcpy(buf, s.data, s.len);
    buf[s.len] = '\0';
    return buf;
}

static inline void ts_promise_reject_uv_status(TSPromiseState *promise, const char *op, int status) {
    ts_promise_rejectf(promise, "%s failed in libuv: %s", op, uv_strerror(status));
}

typedef struct {
    uv_work_t work;
    TSPromiseState *promise;
    char *path;
    Str result;
    bool ok;
    char error[256];
} TSReadFileAsyncReq;

typedef struct {
    uv_work_t work;
    TSPromiseState *promise;
    char *path;
    char *content;
    size_t content_len;
    bool append;
    bool ok;
    char error[256];
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
    bool ok;
    char error[256];
} TSFileSizeAsyncReq;

typedef struct {
    uv_work_t work;
    TSPromiseState *promise;
    char *path;
    StrArr result;
    bool ok;
    char error[256];
} TSListDirAsyncReq;

typedef struct {
    uv_work_t work;
    TSPromiseState *promise;
    char *cmd;
    double result;
    bool ok;
    char error[256];
} TSExecAsyncReq;

static void ts_async_read_file_work(uv_work_t *work) {
    TSReadFileAsyncReq *req = (TSReadFileAsyncReq *)work->data;
    FILE *f = fopen(req->path, "rb");
    if (f == NULL) {
        snprintf(req->error, sizeof(req->error), "readFileAsync failed for \"%s\": %s", req->path, strerror(errno));
        return;
    }

    if (fseek(f, 0, SEEK_END) != 0) {
        snprintf(req->error, sizeof(req->error), "readFileAsync failed for \"%s\": %s", req->path, strerror(errno));
        fclose(f);
        return;
    }

    long sz = ftell(f);
    if (sz < 0) {
        snprintf(req->error, sizeof(req->error), "readFileAsync failed for \"%s\": %s", req->path, strerror(errno));
        fclose(f);
        return;
    }

    if (fseek(f, 0, SEEK_SET) != 0) {
        snprintf(req->error, sizeof(req->error), "readFileAsync failed for \"%s\": %s", req->path, strerror(errno));
        fclose(f);
        return;
    }

    char *buf = (char *)rc_alloc((size_t)sz + 1);
    if (buf == NULL) {
        snprintf(req->error, sizeof(req->error), "readFileAsync failed for \"%s\": out of memory", req->path);
        fclose(f);
        return;
    }

    size_t read = fread(buf, 1, (size_t)sz, f);
    if (read != (size_t)sz && ferror(f)) {
        snprintf(req->error, sizeof(req->error), "readFileAsync failed for \"%s\": %s", req->path, strerror(errno));
        rc_release(buf);
        fclose(f);
        return;
    }

    buf[read] = '\0';
    fclose(f);
    req->result = (Str){ buf, buf, (int)read, 0 };
    req->ok = true;
}

static void ts_async_read_file_done(uv_work_t *work, int status) {
    TSReadFileAsyncReq *req = (TSReadFileAsyncReq *)work->data;
    if (status < 0) {
        ts_promise_reject_uv_status(req->promise, "readFileAsync", status);
    } else if (!req->ok) {
        ts_promise_reject_cstr(req->promise, req->error);
    } else {
        ts_promise_resolve_raw(req->promise, &req->result, sizeof(Str));
    }
    free(req->path);
    free(req);
}

static inline void ts_schedule_read_file(TSPromiseState *promise, Str path) {
    TSReadFileAsyncReq *req = (TSReadFileAsyncReq *)malloc(sizeof(TSReadFileAsyncReq));
    if (req == NULL) {
        ts_promise_reject_cstr(promise, "readFileAsync failed: out of memory");
        return;
    }
    memset(req, 0, sizeof(TSReadFileAsyncReq));
    req->promise = promise;
    req->path = ts_owned_cstr(path);
    if (req->path == NULL) {
        free(req);
        ts_promise_reject_cstr(promise, "readFileAsync failed: out of memory");
        return;
    }
    req->work.data = req;
    int rc = uv_queue_work(ts_uv_loop(), &req->work, ts_async_read_file_work, ts_async_read_file_done);
    if (rc != 0) {
        free(req->path);
        free(req);
        ts_promise_reject_uv_status(promise, "readFileAsync", rc);
    }
}

static void ts_async_write_file_work(uv_work_t *work) {
    TSWriteFileAsyncReq *req = (TSWriteFileAsyncReq *)work->data;
    FILE *f = fopen(req->path, req->append ? "ab" : "wb");
    if (f == NULL) {
        snprintf(req->error, sizeof(req->error), "%s failed for \"%s\": %s", req->append ? "appendFileAsync" : "writeFileAsync", req->path, strerror(errno));
        return;
    }
    size_t wrote = fwrite(req->content, 1, req->content_len, f);
    if (wrote != req->content_len) {
        snprintf(req->error, sizeof(req->error), "%s failed for \"%s\": %s", req->append ? "appendFileAsync" : "writeFileAsync", req->path, strerror(errno));
        fclose(f);
        return;
    }
    fclose(f);
    req->ok = true;
}

static void ts_async_write_file_done(uv_work_t *work, int status) {
    TSWriteFileAsyncReq *req = (TSWriteFileAsyncReq *)work->data;
    if (status < 0) {
        ts_promise_reject_uv_status(req->promise, req->append ? "appendFileAsync" : "writeFileAsync", status);
    } else if (!req->ok) {
        ts_promise_reject_cstr(req->promise, req->error);
    } else {
        ts_promise_resolve_raw(req->promise, NULL, 0);
    }
    free(req->path);
    free(req->content);
    free(req);
}

static inline void ts_schedule_write_file(TSPromiseState *promise, Str path, Str content, bool append) {
    TSWriteFileAsyncReq *req = (TSWriteFileAsyncReq *)malloc(sizeof(TSWriteFileAsyncReq));
    if (req == NULL) {
        ts_promise_reject_cstr(promise, append ? "appendFileAsync failed: out of memory" : "writeFileAsync failed: out of memory");
        return;
    }
    memset(req, 0, sizeof(TSWriteFileAsyncReq));
    req->promise = promise;
    req->path = ts_owned_cstr(path);
    req->content = ts_owned_cstr(content);
    if (req->path == NULL || req->content == NULL) {
        free(req->path);
        free(req->content);
        free(req);
        ts_promise_reject_cstr(promise, append ? "appendFileAsync failed: out of memory" : "writeFileAsync failed: out of memory");
        return;
    }
    req->content_len = (size_t)content.len;
    req->append = append;
    req->work.data = req;
    int rc = uv_queue_work(ts_uv_loop(), &req->work, ts_async_write_file_work, ts_async_write_file_done);
    if (rc != 0) {
        free(req->path);
        free(req->content);
        free(req);
        ts_promise_reject_uv_status(promise, append ? "appendFileAsync" : "writeFileAsync", rc);
    }
}

static void ts_async_file_exists_work(uv_work_t *work) {
    TSFileExistsAsyncReq *req = (TSFileExistsAsyncReq *)work->data;
    Str path = str_from(req->path, (int)strlen(req->path));
    req->result = ts_fileExists(path);
}

static void ts_async_file_exists_done(uv_work_t *work, int status) {
    TSFileExistsAsyncReq *req = (TSFileExistsAsyncReq *)work->data;
    if (status < 0) {
        ts_promise_reject_uv_status(req->promise, "fileExistsAsync", status);
    } else {
        ts_promise_resolve_raw(req->promise, &req->result, sizeof(bool));
    }
    free(req->path);
    free(req);
}

static inline void ts_schedule_file_exists(TSPromiseState *promise, Str path) {
    TSFileExistsAsyncReq *req = (TSFileExistsAsyncReq *)malloc(sizeof(TSFileExistsAsyncReq));
    if (req == NULL) {
        ts_promise_reject_cstr(promise, "fileExistsAsync failed: out of memory");
        return;
    }
    memset(req, 0, sizeof(TSFileExistsAsyncReq));
    req->promise = promise;
    req->path = ts_owned_cstr(path);
    if (req->path == NULL) {
        free(req);
        ts_promise_reject_cstr(promise, "fileExistsAsync failed: out of memory");
        return;
    }
    req->work.data = req;
    int rc = uv_queue_work(ts_uv_loop(), &req->work, ts_async_file_exists_work, ts_async_file_exists_done);
    if (rc != 0) {
        free(req->path);
        free(req);
        ts_promise_reject_uv_status(promise, "fileExistsAsync", rc);
    }
}

static void ts_async_file_size_work(uv_work_t *work) {
    TSFileSizeAsyncReq *req = (TSFileSizeAsyncReq *)work->data;
    struct stat st;
    if (stat(req->path, &st) != 0) {
        snprintf(req->error, sizeof(req->error), "fileSizeAsync failed for \"%s\": %s", req->path, strerror(errno));
        return;
    }
    req->result = (double)st.st_size;
    req->ok = true;
}

static void ts_async_file_size_done(uv_work_t *work, int status) {
    TSFileSizeAsyncReq *req = (TSFileSizeAsyncReq *)work->data;
    if (status < 0) {
        ts_promise_reject_uv_status(req->promise, "fileSizeAsync", status);
    } else if (!req->ok) {
        ts_promise_reject_cstr(req->promise, req->error);
    } else {
        ts_promise_resolve_raw(req->promise, &req->result, sizeof(double));
    }
    free(req->path);
    free(req);
}

static inline void ts_schedule_file_size(TSPromiseState *promise, Str path) {
    TSFileSizeAsyncReq *req = (TSFileSizeAsyncReq *)malloc(sizeof(TSFileSizeAsyncReq));
    if (req == NULL) {
        ts_promise_reject_cstr(promise, "fileSizeAsync failed: out of memory");
        return;
    }
    memset(req, 0, sizeof(TSFileSizeAsyncReq));
    req->promise = promise;
    req->path = ts_owned_cstr(path);
    if (req->path == NULL) {
        free(req);
        ts_promise_reject_cstr(promise, "fileSizeAsync failed: out of memory");
        return;
    }
    req->work.data = req;
    int rc = uv_queue_work(ts_uv_loop(), &req->work, ts_async_file_size_work, ts_async_file_size_done);
    if (rc != 0) {
        free(req->path);
        free(req);
        ts_promise_reject_uv_status(promise, "fileSizeAsync", rc);
    }
}

static void ts_async_list_dir_work(uv_work_t *work) {
    TSListDirAsyncReq *req = (TSListDirAsyncReq *)work->data;
    req->result = StrArr_new();
    DIR *d = opendir(req->path);
    if (d == NULL) {
        snprintf(req->error, sizeof(req->error), "listDirAsync failed for \"%s\": %s", req->path, strerror(errno));
        return;
    }

    struct dirent *ent;
    while ((ent = readdir(d)) != NULL) {
        if (ent->d_name[0] == '.') continue;
        int nlen = (int)strlen(ent->d_name);
        Str s = str_rc_new(ent->d_name, nlen);
        StrArr_push(&req->result, s);
    }
    closedir(d);
    req->ok = true;
}

static void ts_async_list_dir_done(uv_work_t *work, int status) {
    TSListDirAsyncReq *req = (TSListDirAsyncReq *)work->data;
    if (status < 0) {
        ts_promise_reject_uv_status(req->promise, "listDirAsync", status);
    } else if (!req->ok) {
        ts_promise_reject_cstr(req->promise, req->error);
    } else {
        ts_promise_resolve_raw(req->promise, &req->result, sizeof(StrArr));
    }
    free(req->path);
    free(req);
}

static inline void ts_schedule_list_dir(TSPromiseState *promise, Str path) {
    TSListDirAsyncReq *req = (TSListDirAsyncReq *)malloc(sizeof(TSListDirAsyncReq));
    if (req == NULL) {
        ts_promise_reject_cstr(promise, "listDirAsync failed: out of memory");
        return;
    }
    memset(req, 0, sizeof(TSListDirAsyncReq));
    req->promise = promise;
    req->path = ts_owned_cstr(path);
    if (req->path == NULL) {
        free(req);
        ts_promise_reject_cstr(promise, "listDirAsync failed: out of memory");
        return;
    }
    req->work.data = req;
    int rc = uv_queue_work(ts_uv_loop(), &req->work, ts_async_list_dir_work, ts_async_list_dir_done);
    if (rc != 0) {
        free(req->path);
        free(req);
        ts_promise_reject_uv_status(promise, "listDirAsync", rc);
    }
}

static void ts_async_exec_work(uv_work_t *work) {
    TSExecAsyncReq *req = (TSExecAsyncReq *)work->data;
    errno = 0;
    req->result = (double)system(req->cmd);
    if ((int)req->result == -1) {
        snprintf(req->error, sizeof(req->error), "execAsync failed for \"%s\": %s", req->cmd, strerror(errno));
        return;
    }
    req->ok = true;
}

static void ts_async_exec_done(uv_work_t *work, int status) {
    TSExecAsyncReq *req = (TSExecAsyncReq *)work->data;
    if (status < 0) {
        ts_promise_reject_uv_status(req->promise, "execAsync", status);
    } else if (!req->ok) {
        ts_promise_reject_cstr(req->promise, req->error);
    } else {
        ts_promise_resolve_raw(req->promise, &req->result, sizeof(double));
    }
    free(req->cmd);
    free(req);
}

static inline void ts_schedule_exec(TSPromiseState *promise, Str cmd) {
    TSExecAsyncReq *req = (TSExecAsyncReq *)malloc(sizeof(TSExecAsyncReq));
    if (req == NULL) {
        ts_promise_reject_cstr(promise, "execAsync failed: out of memory");
        return;
    }
    memset(req, 0, sizeof(TSExecAsyncReq));
    req->promise = promise;
    req->cmd = ts_owned_cstr(cmd);
    if (req->cmd == NULL) {
        free(req);
        ts_promise_reject_cstr(promise, "execAsync failed: out of memory");
        return;
    }
    req->work.data = req;
    int rc = uv_queue_work(ts_uv_loop(), &req->work, ts_async_exec_work, ts_async_exec_done);
    if (rc != 0) {
        free(req->cmd);
        free(req);
        ts_promise_reject_uv_status(promise, "execAsync", rc);
    }
}

#endif /* TSN_RUNTIME_HOSTED_IO_H */
