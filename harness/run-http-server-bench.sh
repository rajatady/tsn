#!/bin/bash

set -euo pipefail
cd "$(dirname "$0")/.."

WORKERS="${HTTP_SERVER_WORKERS:-4}"
CONCURRENCY="${HTTP_BENCH_CONCURRENCY:-32}"
REQUESTS="${HTTP_BENCH_REQUESTS:-20000}"
WARMUP="${HTTP_BENCH_WARMUP:-2000}"

echo "╔═══════════════════════════════════════════════════════╗"
echo "║  StrictTS HTTP Server: Mixed Workload Bench          ║"
echo "║  real sockets, mixed routes, persistent connections  ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "Workers: $WORKERS  Concurrency: $CONCURRENCY  Requests: $REQUESTS  Warmup: $WARMUP"
echo ""

npx tsx compiler/index.ts targets/http-router.ts > /tmp/strictts-http-router-build.log 2>&1
clang -O2 -pthread -I compiler/runtime -o build/http-server-strictts harness/http-server-strictts.c -lm
clang -O2 -pthread -o build/baseline-http-server baselines/http-server.c
clang -O2 -pthread -o build/http-server-bench harness/http-server-bench.c

sample_rss() {
  local pid="$1"
  local out="$2"
  : > "$out"
  while kill -0 "$pid" 2>/dev/null; do
    local rss
    rss=$(ps -o rss= -p "$pid" | tr -d ' ' || true)
    if [ -n "$rss" ]; then
      echo "$rss" >> "$out"
    fi
    sleep 0.05
  done
}

wait_ready() {
  local port="$1"
  for _ in $(seq 1 100); do
    if curl -fsS "http://127.0.0.1:$port/" > /dev/null 2>&1; then
      return 0
    fi
    sleep 0.05
  done
  return 1
}

run_case() {
  local label="$1"
  local port="$2"
  local cmd="$3"
  local log="/tmp/${label// /-}.log"
  local rss_log="/tmp/${label// /-}.rss"

  HTTP_SERVER_PORT="$port" HTTP_SERVER_WORKERS="$WORKERS" sh -c "$cmd" > "$log" 2>&1 &
  local server_pid=$!

  if ! wait_ready "$port"; then
    echo "  $label failed to start"
    cat "$log"
    kill "$server_pid" 2>/dev/null || true
    wait "$server_pid" 2>/dev/null || true
    return 1
  fi

  sample_rss "$server_pid" "$rss_log" &
  local rss_pid=$!

  local result
  result=$(./build/http-server-bench \
    --port "$port" \
    --requests "$REQUESTS" \
    --concurrency "$CONCURRENCY" \
    --warmup "$WARMUP")

  kill "$rss_pid" 2>/dev/null || true
  kill "$server_pid" 2>/dev/null || true
  wait "$server_pid" 2>/dev/null || true

  python3 - <<PY
import json
from pathlib import Path

label = ${label@Q}
result = json.loads(${result@Q})
rss_values = [int(line.strip()) for line in Path(${rss_log@Q}).read_text().splitlines() if line.strip()]
peak_kb = max(rss_values) if rss_values else 0
peak_mb = peak_kb // 1024
print(f"{label:18} {result['throughput_rps']:10.0f} req/s  p50 {result['latency_p50_ms']:7.2f} ms  p95 {result['latency_p95_ms']:7.2f} ms  p99 {result['latency_p99_ms']:7.2f} ms  rss {peak_mb:4d} MB")
PY
}

printf "%-18s %12s  %12s  %12s  %12s  %10s\n" "Runtime" "Throughput" "p50" "p95" "p99" "Peak RSS"
printf "%-18s %12s  %12s  %12s  %12s  %10s\n" "------------------" "------------" "------------" "------------" "------------" "----------"

run_case "Bun" 4101 "bun targets/http-server-bun.ts"
run_case "StrictTS+C" 4102 "./build/http-server-strictts"
run_case "Hand C" 4103 "./build/baseline-http-server"

echo ""
echo "Workload mix matches the router benchmark request set and runs over persistent HTTP/1.1 connections."
