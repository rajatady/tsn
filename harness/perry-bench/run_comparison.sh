#!/usr/bin/env bash
# Perry vs TSN direct comparison
# Compiles both Perry and TSN versions of each benchmark, runs each 3 times, takes best.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TSN_ROOT="${SCRIPT_DIR}/../.."
PERRY_ROOT="/Users/kumardivyarajat/WebstormProjects/perry"
PERRY_BIN="${PERRY_ROOT}/target/release/perry"
PERRY_SUITE="${PERRY_ROOT}/benchmarks/suite"
TMP="/tmp/tsn-perry-compare"

mkdir -p "$TMP"

echo "════════════════════════════════════════════════════════════════"
echo "  TSN vs Perry — direct comparison"
echo "  Best of 3 runs, macOS ARM64"
echo "════════════════════════════════════════════════════════════════"

# Build TSN binaries
echo ""
echo "Building TSN benchmarks..."
cd "$TSN_ROOT"
for b in fibonacci loop_overhead array_write array_read math_intensive object_create nested_loops accumulate; do
    ./tsn build "harness/perry-bench/$b.ts" > /dev/null 2>&1
    echo "  TSN: $b"
done

# Build Perry binaries
if [ ! -f "$PERRY_BIN" ]; then
    echo "ERROR: Perry not built at $PERRY_BIN"
    exit 1
fi

echo ""
echo "Building Perry benchmarks..."
cd "$PERRY_SUITE"
for ts in 02_loop_overhead:loop_overhead 03_array_write:array_write 04_array_read:array_read 05_fibonacci:fibonacci 06_math_intensive:math_intensive 07_object_create:object_create 10_nested_loops:nested_loops 13_factorial:accumulate; do
    IFS=: read -r src out <<< "$ts"
    "$PERRY_BIN" compile "${src}.ts" -o "$TMP/perry_${out}" > /dev/null 2>&1 || true
    if [ -f "$TMP/perry_${out}" ]; then echo "  Perry: $out"; fi
done

cd "$TSN_ROOT"

# Run benchmarks 3x, take best
get_time() {
    local out="$1" key="$2"
    echo "$out" | grep -oE "${key}:[0-9.]+" | head -1 | cut -d: -f2 | cut -d. -f1
}

best_of() {
    local cmd="$1" key="$2" best=""
    for i in 1 2 3; do
        local out t
        out=$(eval "$cmd" 2>/dev/null) || continue
        t=$(get_time "$out" "$key")
        if [ -n "$t" ] && [ "$t" -ge 0 ] 2>/dev/null; then
            if [ -z "$best" ] || [ "$t" -lt "$best" ]; then best=$t; fi
        fi
    done
    echo "${best:--}"
}

echo ""
echo "Running..."
printf "%-18s %8s %8s %12s\n" "Benchmark" "TSN" "Perry" "Winner"
echo "─────────────────────────────────────────────────────"

for bench in fibonacci loop_overhead array_write array_read math_intensive object_create nested_loops accumulate; do
    tsn_time=$(best_of "./build/$bench" "$bench")
    perry_time=$(best_of "$TMP/perry_$bench" "$bench")

    winner="—"
    if [ "$tsn_time" != "-" ] && [ "$perry_time" != "-" ]; then
        if [ "$tsn_time" -lt "$perry_time" ] 2>/dev/null; then
            winner="TSN"
        elif [ "$perry_time" -lt "$tsn_time" ] 2>/dev/null; then
            winner="Perry"
        else
            winner="tie"
        fi
    fi

    printf "%-18s %8sms %8sms %12s\n" "$bench" "$tsn_time" "$perry_time" "$winner"
done

echo ""
