#ifndef STRICTTS_HTTP_SERVER_COMMON_H
#define STRICTTS_HTTP_SERVER_COMMON_H

#include <arpa/inet.h>
#include <errno.h>
#include <fcntl.h>
#include <netinet/in.h>
#include <netinet/tcp.h>
#include <pthread.h>
#include <signal.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/event.h>
#include <sys/socket.h>
#include <unistd.h>

#define HTTP_REQ_BUF_CAP 8192
#define HTTP_BODY_CAP 4096
#define HTTP_WRITE_BUF_CAP 4608
#define HTTP_MAX_EVENTS 1024

typedef struct {
    int status;
    int body_len;
    char body[HTTP_BODY_CAP];
} HttpResponse;

typedef void (*HttpHandler)(const char *method, int method_len, const char *target, int target_len, HttpResponse *out);

typedef struct {
    int port;
    HttpHandler handler;
} HttpWorkerCtx;

typedef struct {
    int fd;
    int read_len;
    int write_len;
    int write_off;
    char req_buf[HTTP_REQ_BUF_CAP];
    char write_buf[HTTP_WRITE_BUF_CAP];
} HttpConn;

static inline int http_server_port(void) {
    const char *raw = getenv("HTTP_SERVER_PORT");
    if (!raw || raw[0] == '\0') return 3000;
    return atoi(raw);
}

static inline int http_server_workers(void) {
    const char *raw = getenv("HTTP_SERVER_WORKERS");
    if (!raw || raw[0] == '\0') return 1;
    int workers = atoi(raw);
    return workers > 0 ? workers : 1;
}

static inline const char *http_status_text(int status) {
    switch (status) {
        case 200: return "OK";
        case 404: return "Not Found";
        default: return "OK";
    }
}

static inline int http_set_nonblocking(int fd) {
    int flags = fcntl(fd, F_GETFL, 0);
    if (flags < 0) return -1;
    return fcntl(fd, F_SETFL, flags | O_NONBLOCK);
}

static inline int http_listen_socket(int port) {
    int fd = socket(AF_INET, SOCK_STREAM, 0);
    if (fd < 0) {
        perror("socket");
        return -1;
    }

    int yes = 1;
    setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, &yes, sizeof(yes));
    setsockopt(fd, SOL_SOCKET, SO_REUSEPORT, &yes, sizeof(yes));

    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
    addr.sin_port = htons((uint16_t)port);

    if (bind(fd, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
        perror("bind");
        close(fd);
        return -1;
    }
    if (http_set_nonblocking(fd) < 0) {
        perror("fcntl");
        close(fd);
        return -1;
    }
    if (listen(fd, 1024) < 0) {
        perror("listen");
        close(fd);
        return -1;
    }
    return fd;
}

static inline int http_find_header_end(const char *buf, int len) {
    for (int i = 3; i < len; i++) {
        if (buf[i - 3] == '\r' && buf[i - 2] == '\n' && buf[i - 1] == '\r' && buf[i] == '\n') {
            return i + 1;
        }
    }
    return -1;
}

static inline int http_find_line_end(const char *buf, int len) {
    for (int i = 1; i < len; i++) {
        if (buf[i - 1] == '\r' && buf[i] == '\n') {
            return i - 1;
        }
    }
    return -1;
}

static inline int http_parse_request(
    HttpConn *conn,
    char *buf,
    const char **method,
    int *method_len,
    const char **target,
    int *target_len,
    int *consumed
) {
    int header_end = http_find_header_end(conn->req_buf, conn->read_len);
    if (header_end < 0) return 0;

    int line_end_idx = http_find_line_end(buf, conn->read_len);
    if (line_end_idx < 0) return -1;

    char *line_end = buf + line_end_idx;
    char *sp1 = memchr(buf, ' ', (size_t)(line_end - buf));
    if (!sp1) return -1;
    char *sp2 = memchr(sp1 + 1, ' ', (size_t)(line_end - (sp1 + 1)));
    if (!sp2) return -1;

    *method = buf;
    *method_len = (int)(sp1 - buf);
    *target = sp1 + 1;
    *target_len = (int)(sp2 - (sp1 + 1));
    *consumed = header_end;
    return 1;
}

static inline int http_build_response(HttpConn *conn, HttpHandler handler) {
    const char *method = NULL;
    const char *target = NULL;
    int method_len = 0;
    int target_len = 0;
    int consumed = 0;
    int parsed = http_parse_request(conn, conn->req_buf, &method, &method_len, &target, &target_len, &consumed);
    if (parsed <= 0) return parsed;

    HttpResponse resp;
    memset(&resp, 0, sizeof(resp));
    handler(method, method_len, target, target_len, &resp);

    char head[512];
    int head_len = snprintf(
        head,
        sizeof(head),
        "HTTP/1.1 %d %s\r\n"
        "Content-Type: text/plain\r\n"
        "Content-Length: %d\r\n"
        "Connection: keep-alive\r\n"
        "\r\n",
        resp.status,
        http_status_text(resp.status),
        resp.body_len
    );
    if (head_len < 0) return -1;
    if (head_len + resp.body_len > HTTP_WRITE_BUF_CAP) return -1;

    memcpy(conn->write_buf, head, (size_t)head_len);
    if (resp.body_len > 0) {
        memcpy(conn->write_buf + head_len, resp.body, (size_t)resp.body_len);
    }
    conn->write_len = head_len + resp.body_len;
    conn->write_off = 0;

    int remaining = conn->read_len - consumed;
    if (remaining > 0) {
        memmove(conn->req_buf, conn->req_buf + consumed, (size_t)remaining);
    }
    conn->read_len = remaining;
    return 1;
}

static inline void http_close_conn(int kq, HttpConn *conn) {
    if (!conn) return;
    struct kevent change[2];
    EV_SET(&change[0], conn->fd, EVFILT_READ, EV_DELETE, 0, 0, NULL);
    EV_SET(&change[1], conn->fd, EVFILT_WRITE, EV_DELETE, 0, 0, NULL);
    kevent(kq, change, 2, NULL, 0, NULL);
    close(conn->fd);
    free(conn);
}

static inline void http_watch_read(int kq, HttpConn *conn) {
    struct kevent change[2];
    EV_SET(&change[0], conn->fd, EVFILT_READ, EV_ADD | EV_ENABLE, 0, 0, conn);
    EV_SET(&change[1], conn->fd, EVFILT_WRITE, EV_ADD | EV_DISABLE, 0, 0, conn);
    kevent(kq, change, 2, NULL, 0, NULL);
}

static inline void http_watch_write(int kq, HttpConn *conn) {
    struct kevent change[2];
    EV_SET(&change[0], conn->fd, EVFILT_READ, EV_ADD | EV_DISABLE, 0, 0, conn);
    EV_SET(&change[1], conn->fd, EVFILT_WRITE, EV_ADD | EV_ENABLE, 0, 0, conn);
    kevent(kq, change, 2, NULL, 0, NULL);
}

static inline void http_handle_readable(int kq, HttpConn *conn, HttpHandler handler) {
    while (1) {
        if (conn->read_len >= HTTP_REQ_BUF_CAP) {
            http_close_conn(kq, conn);
            return;
        }

        ssize_t n = recv(conn->fd, conn->req_buf + conn->read_len, (size_t)(HTTP_REQ_BUF_CAP - conn->read_len), 0);
        if (n == 0) {
            http_close_conn(kq, conn);
            return;
        }
        if (n < 0) {
            if (errno == EAGAIN || errno == EWOULDBLOCK) return;
            http_close_conn(kq, conn);
            return;
        }

        conn->read_len += (int)n;
        int built = http_build_response(conn, handler);
        if (built < 0) {
            http_close_conn(kq, conn);
            return;
        }
        if (built == 1) {
            http_watch_write(kq, conn);
            return;
        }
    }
}

static inline void http_handle_writable(int kq, HttpConn *conn, HttpHandler handler) {
    while (conn->write_off < conn->write_len) {
        ssize_t n = send(conn->fd, conn->write_buf + conn->write_off, (size_t)(conn->write_len - conn->write_off), 0);
        if (n < 0) {
            if (errno == EAGAIN || errno == EWOULDBLOCK) return;
            http_close_conn(kq, conn);
            return;
        }
        if (n == 0) {
            http_close_conn(kq, conn);
            return;
        }
        conn->write_off += (int)n;
    }

    conn->write_len = 0;
    conn->write_off = 0;

    if (conn->read_len > 0) {
        int built = http_build_response(conn, handler);
        if (built < 0) {
            http_close_conn(kq, conn);
            return;
        }
        if (built == 1) {
            http_watch_write(kq, conn);
            return;
        }
    }

    http_watch_read(kq, conn);
}

static inline void *http_worker_main(void *arg) {
    HttpWorkerCtx *ctx = (HttpWorkerCtx *)arg;
    int listen_fd = http_listen_socket(ctx->port);
    if (listen_fd < 0) return NULL;

    int kq = kqueue();
    if (kq < 0) {
        perror("kqueue");
        close(listen_fd);
        return NULL;
    }

    struct kevent listen_event;
    EV_SET(&listen_event, listen_fd, EVFILT_READ, EV_ADD | EV_ENABLE, 0, 0, NULL);
    if (kevent(kq, &listen_event, 1, NULL, 0, NULL) < 0) {
        perror("kevent");
        close(kq);
        close(listen_fd);
        return NULL;
    }

    struct kevent events[HTTP_MAX_EVENTS];
    while (1) {
        int n = kevent(kq, NULL, 0, events, HTTP_MAX_EVENTS, NULL);
        if (n < 0) {
            if (errno == EINTR) continue;
            perror("kevent");
            continue;
        }

        for (int i = 0; i < n; i++) {
            struct kevent *ev = &events[i];
            if ((int)ev->ident == listen_fd) {
                while (1) {
                    int client = accept(listen_fd, NULL, NULL);
                    if (client < 0) {
                        if (errno == EAGAIN || errno == EWOULDBLOCK) break;
                        if (errno == EINTR) continue;
                        if (errno == ECONNABORTED) break;
                        perror("accept");
                        break;
                    }

                    int yes = 1;
                    setsockopt(client, IPPROTO_TCP, TCP_NODELAY, &yes, sizeof(yes));
#ifdef SO_NOSIGPIPE
                    setsockopt(client, SOL_SOCKET, SO_NOSIGPIPE, &yes, sizeof(yes));
#endif
                    if (http_set_nonblocking(client) < 0) {
                        close(client);
                        continue;
                    }

                    HttpConn *conn = (HttpConn *)calloc(1, sizeof(HttpConn));
                    if (!conn) {
                        perror("calloc");
                        close(client);
                        continue;
                    }
                    conn->fd = client;
                    http_watch_read(kq, conn);
                }
                continue;
            }

            HttpConn *conn = (HttpConn *)ev->udata;
            if (!conn) continue;

            if ((ev->flags & EV_ERROR) != 0 || (ev->flags & EV_EOF) != 0) {
                http_close_conn(kq, conn);
                continue;
            }

            if (ev->filter == EVFILT_READ) {
                http_handle_readable(kq, conn, ctx->handler);
            } else if (ev->filter == EVFILT_WRITE) {
                http_handle_writable(kq, conn, ctx->handler);
            }
        }
    }
    close(kq);
    close(listen_fd);
    return NULL;
}

static inline int run_http_server(HttpHandler handler) {
    signal(SIGPIPE, SIG_IGN);
    int port = http_server_port();
    int workers = http_server_workers();

    HttpWorkerCtx ctx = { .port = port, .handler = handler };
    if (workers <= 1) {
        http_worker_main(&ctx);
        return 0;
    }

    pthread_t *threads = (pthread_t *)calloc((size_t)(workers - 1), sizeof(pthread_t));
    if (!threads) {
        perror("calloc");
        return 1;
    }
    for (int i = 0; i < workers - 1; i++) {
        if (pthread_create(&threads[i], NULL, http_worker_main, &ctx) != 0) {
            perror("pthread_create");
            free(threads);
            return 1;
        }
    }

    http_worker_main(&ctx);
    free(threads);
    return 0;
}

#endif
