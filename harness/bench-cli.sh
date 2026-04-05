#!/bin/bash
# ─── CLI Workload Benchmark ─────────────────────────────────────────
# Measures what a USER sees: total wall time from invocation to output.
# This includes runtime startup, JIT warmup, and actual processing.

set -e
cd "$(dirname "$0")/.."

JS_STDLIB_SHIM="$(pwd)/harness/js-stdlib-shim.cjs"

echo "╔═══════════════════════════════════════════════════════╗"
echo "║  StrictTS CLI Workloads: End-to-End Benchmarks       ║"
echo "║  5 runs per case, median wall time + peak RSS        ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

now_ns() { python3 -c 'import time; print(int(time.time_ns()))'; }
resolve_binary() { python3 -c 'import os,sys; print(os.path.realpath(sys.argv[1]))' "$1"; }

echo "Binary sizes:"
echo "  Node runtime:    $(ls -lh "$(resolve_binary "$(which node)")" | awk '{print $5}')"
if command -v bun &> /dev/null; then
    echo "  Bun runtime:     $(ls -lh "$(resolve_binary "$(which bun)")" | awk '{print $5}')"
else
    echo "  Bun runtime:     not installed"
fi
echo ""

record_count_csv() {
    tail -n +2 "$1" | grep -cve '^[[:space:]]*$'
}

record_count_lines() {
    grep -cve '^[[:space:]]*$' -e '^[[:space:]]*#' "$1"
}

run_bench() {
    local label="$1"
    local input="$2"
    local records="$3"
    local command="$4"
    local times=()
    for i in 1 2 3 4 5; do
        local t0=$(now_ns)
        sh -c "$command < $input" > /dev/null 2>&1
        local t1=$(now_ns)
        local ms=$(( (t1 - t0) / 1000000 ))
        times+=($ms)
    done
    local sorted=($(printf '%s\n' "${times[@]}" | sort -n))
    local median=${sorted[2]}

    local rss_output=$( { /usr/bin/time -l sh -c "$command < $input" > /dev/null; } 2>&1 )
    local rss=$(echo "$rss_output" | grep "maximum resident" | awk '{print $1}')
    local rss_mb=$((rss / 1024 / 1024))
    local throughput=$(( records * 1000 / (median + 1) ))

    printf "  %-12s %6d ms   %4d MB   %7d records/sec\n" "$label" "$median" "$rss_mb" "$throughput"
}

bench_case() {
    local title="$1"
    local summary="$2"
    local source="$3"
    local binary="$4"
    local input="$5"
    local records="$6"
    local size
    size=$(ls -lh "$input" | awk '{print $5}')

    echo "━━━ $title ━━━"
    echo "  $summary"
    echo "  Input: $records records, $size"
    if [ -f "$binary" ]; then
        echo "  Native binary: $(ls -lh "$binary" | awk '{print $5}')"
    else
        echo "  Native binary: not built"
    fi
    echo "  Runtime      Time     Memory   Throughput"
    echo "  ──────────── ──────── ──────── ─────────────────"

    run_bench "Node" "$input" "$records" "NODE_OPTIONS=--require=$JS_STDLIB_SHIM npx tsx $source"

    if command -v bun &> /dev/null; then
        run_bench "Bun" "$input" "$records" "bun --preload $JS_STDLIB_SHIM $source"
    else
        printf "  %-12s %6s     %4s     %s\n" "Bun" "---" "---" "not installed"
    fi

    if [ -f "$binary" ]; then
        run_bench "Native" "$input" "$records" "$binary"
    else
        printf "  %-12s %6s     %4s     %s\n" "Native" "---" "---" "not built"
    fi

    echo ""
}

bench_case \
    "CSV Tool" \
    "Process a large CSV, filter age>30, sort by score, output top 20." \
    "targets/csv-tool.ts" \
    "./build/csv-tool" \
    "harness/test-data/large.csv" \
    "$(record_count_csv harness/test-data/large.csv)"

bench_case \
    "Config Audit" \
    "Audit deployment-style env config for risky flags and readiness gaps." \
    "examples/config-audit.ts" \
    "./build/config-audit" \
    "harness/test-data/config-audit.env" \
    "$(record_count_lines harness/test-data/config-audit.env)"

bench_case \
    "Access Log Summary" \
    "Summarize access logs into health signals and hot paths." \
    "examples/access-log-summary.ts" \
    "./build/access-log-summary" \
    "harness/test-data/access-log.txt" \
    "$(record_count_lines harness/test-data/access-log.txt)"

bench_case \
    "Log Triage" \
    "Normalize production log lines and extract actionable incident counts." \
    "examples/log-triage.ts" \
    "./build/log-triage" \
    "harness/test-data/log-triage.txt" \
    "$(record_count_lines harness/test-data/log-triage.txt)"

bench_case \
    "Revenue Rollup" \
    "Roll up revenue, cost, margin, and top regions from finance CSV data." \
    "examples/revenue-rollup.ts" \
    "./build/revenue-rollup" \
    "harness/test-data/revenue-rollup.csv" \
    "$(record_count_csv harness/test-data/revenue-rollup.csv)"

bench_case \
    "SLA Scorecard" \
    "Aggregate uptime, latency, and error-rate snapshots into an SLA report." \
    "examples/sla-scorecard.ts" \
    "./build/sla-scorecard" \
    "harness/test-data/sla-scorecard.csv" \
    "$(record_count_csv harness/test-data/sla-scorecard.csv)"

echo ""
echo "Time is total wall time from invocation to exit. Memory is peak RSS. Throughput is input records processed per second."
