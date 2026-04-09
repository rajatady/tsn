#!/bin/bash
# ─── Benchmark Harness ──────────────────────────────────────────────
# Measures execution time with nanosecond precision and peak RSS.
# No more "0 ms" — we show microseconds when needed.

set -e
cd "$(dirname "$0")/.."

ITERATIONS=5
JS_STDLIB_SHIM="$(pwd)/harness/js-stdlib-shim.cjs"

# Get time in nanoseconds (macOS)
now_ns() {
    python3 -c 'import time; print(int(time.time_ns()))'
}

# Get peak RSS in KB for a command
measure() {
    local label="$1"
    shift

    local times_us=()
    local mems_kb=()

    for i in $(seq 1 $ITERATIONS); do
        # Capture RSS via /usr/bin/time
        local time_output
        time_output=$( { /usr/bin/time -l "$@" > /dev/null; } 2>&1 )

        local max_rss
        max_rss=$(echo "$time_output" | grep "maximum resident" | awk '{print $1}')
        local mem_kb=$((max_rss / 1024))

        # Capture wall time with ns precision
        local t0=$(now_ns)
        "$@" > /dev/null 2>&1
        local t1=$(now_ns)
        local elapsed_us=$(( (t1 - t0) / 1000 ))

        times_us+=("$elapsed_us")
        mems_kb+=("$mem_kb")
    done

    # Median
    local sorted_times=($(printf '%s\n' "${times_us[@]}" | sort -n))
    local sorted_mems=($(printf '%s\n' "${mems_kb[@]}" | sort -n))
    local mid=$((ITERATIONS / 2))

    local median_us="${sorted_times[$mid]}"
    local median_mem="${sorted_mems[$mid]}"

    # Format time: show µs if < 1000, ms if < 1000000, s otherwise
    local time_str
    if [ "$median_us" -lt 1000 ]; then
        time_str="${median_us} µs"
    elif [ "$median_us" -lt 1000000 ]; then
        local ms=$((median_us / 1000))
        local frac=$(( (median_us % 1000) / 100 ))
        time_str="${ms}.${frac} ms"
    else
        local s=$((median_us / 1000000))
        local ms=$(( (median_us % 1000000) / 1000 ))
        time_str="${s}.${ms} s"
    fi

    # Format memory
    local mem_str
    if [ "$median_mem" -gt 1048576 ]; then
        local gb=$((median_mem / 1048576))
        local mb=$(( (median_mem % 1048576) / 1024 ))
        mem_str="${gb}.${mb} GB"
    elif [ "$median_mem" -gt 1024 ]; then
        local mb=$((median_mem / 1024))
        mem_str="${mb} MB"
    else
        mem_str="${median_mem} KB"
    fi

    printf "  %-8s %12s  %12s\n" "$label" "$time_str" "$mem_str"
}

bench_case() {
    local label="$1"
    local source="$2"
    local input="$3"
    local binary="$4"
    local baseline="$5"
    local node_cmd="NODE_OPTIONS=--require=$JS_STDLIB_SHIM npx tsx $source"
    local bun_cmd="bun --preload $JS_STDLIB_SHIM $source"

    echo ""
    echo "━━━ $label ━━━"

    if [ -n "$input" ]; then
        measure "Node" sh -c "$node_cmd < $input"
    else
        measure "Node" sh -c "$node_cmd"
    fi

    if command -v bun &> /dev/null; then
        if [ -n "$input" ]; then
            measure "Bun" sh -c "$bun_cmd < $input"
        else
            measure "Bun" sh -c "$bun_cmd"
        fi
    fi

    if [ -f "build/$binary" ]; then
        if [ -n "$input" ]; then
            measure "Native" sh -c "./build/$binary < $input"
        else
            measure "Native" "./build/$binary"
        fi
    else
        printf "  %-8s %12s  %12s\n" "Native" "---" "not compiled"
    fi

    if [ -n "$baseline" ] && [ -f "$baseline" ]; then
        if [ -n "$input" ]; then
            measure "Hand C" sh -c "$baseline < $input"
        else
            measure "Hand C" "$baseline"
        fi
    fi
}

echo "╔═══════════════════════════════════════════════════════╗"
echo "║  TSN → Native: Benchmarks                       ║"
echo "║  ${ITERATIONS} iterations, median, nanosecond precision          ║"
echo "╚═══════════════════════════════════════════════════════╝"

echo ""
echo "Core targets"
bench_case "json-pipeline" "targets/json-pipeline.ts" "harness/test-data/large-dataset.json" "json-pipeline" "./build/baseline-json-pipeline"
bench_case "http-router" "targets/http-router.ts" "" "http-router" "./build/baseline-http-router"
bench_case "markdown-parser" "targets/markdown-parser.ts" "harness/test-data/sample.md" "markdown-parser" "./build/baseline-markdown-parser"
bench_case "csv-tool" "targets/csv-tool.ts" "harness/test-data/large.csv" "csv-tool" ""

echo ""
echo "Real-world CLI examples"
bench_case "config-audit" "examples/config-audit.ts" "harness/test-data/config-audit.env" "config-audit" ""
bench_case "access-log-summary" "examples/access-log-summary.ts" "harness/test-data/access-log.txt" "access-log-summary" ""
bench_case "log-triage" "examples/log-triage.ts" "harness/test-data/log-triage.txt" "log-triage" ""
bench_case "revenue-rollup" "examples/revenue-rollup.ts" "harness/test-data/revenue-rollup.csv" "revenue-rollup" ""
bench_case "sla-scorecard" "examples/sla-scorecard.ts" "harness/test-data/sla-scorecard.csv" "sla-scorecard" ""

echo ""
echo "Done."
