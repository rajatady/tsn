#ifndef STRICTTS_RUNTIME_HOSTED_IO_H
#define STRICTTS_RUNTIME_HOSTED_IO_H

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

#endif /* STRICTTS_RUNTIME_HOSTED_IO_H */
