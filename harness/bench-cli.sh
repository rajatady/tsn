#!/bin/bash
# ─── CLI Tool Benchmark ─────────────────────────────────────────────
# Measures what a USER sees: total wall time from invocation to output.
# This includes runtime startup, JIT warmup, and actual processing.

set -e
cd "$(dirname "$0")/.."

CSV="harness/test-data/large.csv"
ROWS=$(tail -n +2 "$CSV" | wc -l | tr -d ' ')
SIZE=$(ls -lh "$CSV" | awk '{print $5}')

echo "╔═══════════════════════════════════════════════════════╗"
echo "║  CLI Tool Benchmark: Process $ROWS rows ($SIZE CSV)     ║"
echo "║  Filter age>30, sort by score, output top 20         ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

now_ns() { python3 -c 'import time; print(int(time.time_ns()))'; }

# Binary sizes
echo "Binary sizes:"
echo "  Node runtime:    $(ls -lh $(which node) | awk '{print $5}')"
echo "  Bun runtime:     $(ls -lh $(which bun) | awk '{print $5}')"
echo "  Native binary:   $(ls -lh build/csv-tool | awk '{print $5}')"
echo ""

run_bench() {
    local label="$1"
    shift
    local times=()
    for i in 1 2 3 4 5; do
        local t0=$(now_ns)
        "$@" < "$CSV" > /dev/null 2>&1
        local t1=$(now_ns)
        local ms=$(( (t1 - t0) / 1000000 ))
        times+=($ms)
    done
    # Sort and take median
    local sorted=($(printf '%s\n' "${times[@]}" | sort -n))
    local median=${sorted[2]}

    # Peak RSS
    local rss_output=$( { /usr/bin/time -l "$@" < "$CSV" > /dev/null; } 2>&1 )
    local rss=$(echo "$rss_output" | grep "maximum resident" | awk '{print $1}')
    local rss_mb=$((rss / 1024 / 1024))

    printf "  %-12s %6d ms   %4d MB   %s rows/sec\n" "$label" "$median" "$rss_mb" "$(echo "scale=0; $ROWS * 1000 / ($median + 1)" | bc)"
}

echo "Results (median of 5 runs):"
echo "  Runtime      Time     Memory   Throughput"
echo "  ──────────── ──────── ──────── ──────────"

run_bench "Node" npx tsx targets/csv-tool.ts
run_bench "Bun" bun targets/csv-tool.ts
run_bench "Native" ./build/csv-tool

echo ""
echo "What this means:"
echo "  - 'Time' = total wall time from invocation to exit (startup + processing)"
echo "  - 'Memory' = peak resident set size"
echo "  - 'Throughput' = rows processed per second"
