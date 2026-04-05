#!/bin/bash
# ─── Benchmark Harness ──────────────────────────────────────────────
# Measures execution time with nanosecond precision and peak RSS.
# No more "0 ms" — we show microseconds when needed.

set -e
cd "$(dirname "$0")/.."

ITERATIONS=5

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

bench_target() {
    local name="$1"
    local input="$2"

    echo ""
    echo "━━━ $name ━━━"

    # Node.js
    if [ -n "$input" ]; then
        measure "Node" sh -c "npx tsx targets/$name.ts < $input"
    else
        measure "Node" npx tsx "targets/$name.ts"
    fi

    # Bun
    if command -v bun &> /dev/null; then
        if [ -n "$input" ]; then
            measure "Bun" sh -c "bun targets/$name.ts < $input"
        else
            measure "Bun" bun "targets/$name.ts"
        fi
    fi

    # Native (compiler output)
    if [ -f "build/$name" ]; then
        if [ -n "$input" ]; then
            measure "Native" sh -c "./build/$name < $input"
        else
            measure "Native" "./build/$name"
        fi
    else
        printf "  %-8s %12s  %12s\n" "Native" "---" "not compiled"
    fi

    # Hand-optimized C baseline
    if [ -f "build/baseline-$name" ]; then
        if [ -n "$input" ]; then
            measure "Hand C" sh -c "./build/baseline-$name < $input"
        else
            measure "Hand C" "./build/baseline-$name"
        fi
    fi
}

echo "╔═══════════════════════════════════════════════════════╗"
echo "║  StrictTS → Native: Benchmarks                       ║"
echo "║  ${ITERATIONS} iterations, median, nanosecond precision          ║"
echo "╚═══════════════════════════════════════════════════════╝"

bench_target "json-pipeline" "harness/test-data/large-dataset.json"
bench_target "http-router" ""
bench_target "markdown-parser" "harness/test-data/sample.md"

echo ""
echo "Done."
