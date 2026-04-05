#include <arpa/inet.h>
#include <errno.h>
#include <math.h>
#include <netinet/in.h>
#include <netinet/tcp.h>
#include <pthread.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <time.h>
#include <unistd.h>

#define HTTP_HEAD_BUF_CAP 8192
#define HTTP_REQ_BUF_CAP 512

typedef struct {
    const char *method;
    const char *target;
} BenchRequest;

typedef struct {
    const char *host;
    int port;
    int request_count;
    int offset;
    int warmup;
    double *latencies;
} BenchWorker;

static const BenchRequest REQUESTS[] = {
    { "GET", "/" },
    { "GET", "/users" },
    { "GET", "/users/42" },
    { "GET", "/users/42/posts" },
    { "GET", "/users/42/posts/7" },
    { "POST", "/users" },
    { "GET", "/search?q=hello&page=2&limit=20" },
    { "GET", "/api/v1/health" },
    { "GET", "/nonexistent" },
    { "DELETE", "/users/1" },
    { "GET", "/users/99/posts?sort=date&order=desc" },
};

static uint64_t now_ns(void) {
#ifdef __APPLE__
    return clock_gettime_nsec_np(CLOCK_UPTIME_RAW);
#else
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (uint64_t)ts.tv_sec * 1000000000ull + (uint64_t)ts.tv_nsec;
#endif
}

static int send_all(int fd, const char *buf, int len) {
    int sent = 0;
    while (sent < len) {
        ssize_t n = send(fd, buf + sent, (size_t)(len - sent), 0);
        if (n <= 0) return -1;
        sent += (int)n;
    }
    return 0;
}

static int recv_all(int fd, char *buf, int len) {
    int got = 0;
    while (got < len) {
        ssize_t n = recv(fd, buf + got, (size_t)(len - got), 0);
        if (n <= 0) return -1;
        got += (int)n;
    }
    return 0;
}

static int find_header_end(const char *buf, int len) {
    for (int i = 3; i < len; i++) {
        if (buf[i - 3] == '\r' && buf[i - 2] == '\n' && buf[i - 1] == '\r' && buf[i] == '\n') {
            return i + 1;
        }
    }
    return -1;
}

static int read_response(int fd) {
    char head[HTTP_HEAD_BUF_CAP];
    int len = 0;
    int header_end = -1;
    while (len < HTTP_HEAD_BUF_CAP) {
        ssize_t n = recv(fd, head + len, (size_t)(HTTP_HEAD_BUF_CAP - len), 0);
        if (n <= 0) return -1;
        len += (int)n;
        header_end = find_header_end(head, len);
        if (header_end >= 0) break;
    }
    if (header_end < 0) return -1;

    int content_length = 0;
    int line_start = 0;
    while (line_start < header_end) {
        int line_end = line_start;
        while (line_end + 1 < header_end && !(head[line_end] == '\r' && head[line_end + 1] == '\n')) {
            line_end++;
        }
        if (line_end > line_start) {
            int line_len = line_end - line_start;
            if (line_len >= 15 && strncasecmp(head + line_start, "Content-Length:", 15) == 0) {
                content_length = atoi(head + line_start + 15);
            }
        }
        line_start = line_end + 2;
    }

    int already = len - header_end;
    if (already < content_length) {
        return recv_all(fd, head, content_length - already);
    }
    return 0;
}

static int connect_server(const char *host, int port) {
    int fd = socket(AF_INET, SOCK_STREAM, 0);
    if (fd < 0) return -1;

    int yes = 1;
    setsockopt(fd, IPPROTO_TCP, TCP_NODELAY, &yes, sizeof(yes));

    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin_family = AF_INET;
    addr.sin_port = htons((uint16_t)port);
    if (inet_pton(AF_INET, host, &addr.sin_addr) <= 0) {
        close(fd);
        return -1;
    }
    if (connect(fd, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
        close(fd);
        return -1;
    }
    return fd;
}

static void *bench_worker_main(void *arg) {
    BenchWorker *worker = (BenchWorker *)arg;
    int fd = connect_server(worker->host, worker->port);
    if (fd < 0) return (void *)1;

    char req[HTTP_REQ_BUF_CAP];
    int request_type_count = (int)(sizeof(REQUESTS) / sizeof(REQUESTS[0]));

    for (int i = 0; i < worker->request_count; i++) {
        BenchRequest spec = REQUESTS[(worker->offset + i) % request_type_count];
        int req_len = snprintf(
            req,
            sizeof(req),
            "%s %s HTTP/1.1\r\n"
            "Host: %s\r\n"
            "Connection: keep-alive\r\n"
            "\r\n",
            spec.method,
            spec.target,
            worker->host
        );
        if (req_len <= 0 || req_len >= (int)sizeof(req)) {
            close(fd);
            return (void *)1;
        }

        uint64_t start = now_ns();
        if (send_all(fd, req, req_len) < 0 || read_response(fd) < 0) {
            close(fd);
            return (void *)1;
        }
        if (!worker->warmup) {
            worker->latencies[i] = (double)(now_ns() - start) / 1000000.0;
        }
    }

    close(fd);
    return NULL;
}

static int compare_double(const void *a, const void *b) {
    double da = *(const double *)a;
    double db = *(const double *)b;
    return (da > db) - (da < db);
}

static double percentile(const double *values, int len, double p) {
    if (len <= 0) return 0.0;
    int idx = (int)((len - 1) * p);
    return values[idx];
}

static int run_phase(const char *host, int port, int total_requests, int concurrency, int warmup, double **out_latencies) {
    BenchWorker *workers = (BenchWorker *)calloc((size_t)concurrency, sizeof(BenchWorker));
    pthread_t *threads = (pthread_t *)calloc((size_t)concurrency, sizeof(pthread_t));
    if (!workers || !threads) return 1;

    int per_worker = total_requests / concurrency;
    int extra = total_requests % concurrency;
    int offset = 0;
    for (int i = 0; i < concurrency; i++) {
        int count = per_worker + (i < extra ? 1 : 0);
        workers[i].host = host;
        workers[i].port = port;
        workers[i].request_count = count;
        workers[i].offset = offset;
        workers[i].warmup = warmup;
        workers[i].latencies = warmup ? NULL : (double *)calloc((size_t)count, sizeof(double));
        offset += count;
        if (pthread_create(&threads[i], NULL, bench_worker_main, &workers[i]) != 0) {
            free(workers);
            free(threads);
            return 1;
        }
    }

    int failed = 0;
    for (int i = 0; i < concurrency; i++) {
        void *result = NULL;
        pthread_join(threads[i], &result);
        if (result != NULL) failed = 1;
    }
    if (failed) {
        free(workers);
        free(threads);
        return 1;
    }

    if (!warmup) {
        double *all = (double *)calloc((size_t)total_requests, sizeof(double));
        if (!all) {
            free(workers);
            free(threads);
            return 1;
        }
        int pos = 0;
        for (int i = 0; i < concurrency; i++) {
            for (int j = 0; j < workers[i].request_count; j++) {
                all[pos++] = workers[i].latencies[j];
            }
            free(workers[i].latencies);
        }
        *out_latencies = all;
    }

    free(workers);
    free(threads);
    return 0;
}

int main(int argc, char **argv) {
    const char *host = "127.0.0.1";
    int port = 3000;
    int requests = 20000;
    int concurrency = 32;
    int warmup = 2000;

    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "--host") == 0 && i + 1 < argc) host = argv[++i];
        else if (strcmp(argv[i], "--port") == 0 && i + 1 < argc) port = atoi(argv[++i]);
        else if (strcmp(argv[i], "--requests") == 0 && i + 1 < argc) requests = atoi(argv[++i]);
        else if (strcmp(argv[i], "--concurrency") == 0 && i + 1 < argc) concurrency = atoi(argv[++i]);
        else if (strcmp(argv[i], "--warmup") == 0 && i + 1 < argc) warmup = atoi(argv[++i]);
    }

    if (run_phase(host, port, warmup, concurrency, 1, NULL) != 0) return 1;

    uint64_t started = now_ns();
    double *latencies = NULL;
    if (run_phase(host, port, requests, concurrency, 0, &latencies) != 0) return 1;
    double elapsed_s = (double)(now_ns() - started) / 1000000000.0;

    qsort(latencies, (size_t)requests, sizeof(double), compare_double);

    double sum = 0.0;
    for (int i = 0; i < requests; i++) sum += latencies[i];

    int mid = requests / 2;
    double p50 = requests % 2 == 0 ? (latencies[mid - 1] + latencies[mid]) / 2.0 : latencies[mid];

    printf(
        "{\"requests\":%d,\"concurrency\":%d,\"throughput_rps\":%.6f,"
        "\"latency_avg_ms\":%.6f,\"latency_p50_ms\":%.6f,\"latency_p95_ms\":%.6f,"
        "\"latency_p99_ms\":%.6f,\"elapsed_s\":%.6f}\n",
        requests,
        concurrency,
        elapsed_s > 0.0 ? (double)requests / elapsed_s : 0.0,
        requests > 0 ? sum / requests : 0.0,
        p50,
        percentile(latencies, requests, 0.95),
        percentile(latencies, requests, 0.99),
        elapsed_s
    );

    free(latencies);
    return 0;
}
