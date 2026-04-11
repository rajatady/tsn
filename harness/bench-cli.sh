#!/bin/bash
# ─── CLI Workload Benchmark ─────────────────────────────────────────
# Measures what a USER sees: total wall time from invocation to output.
# This includes runtime startup, JIT warmup, and actual processing.

set -e
cd "$(dirname "$0")/.."

JS_STDLIB_SHIM="$(pwd)/harness/js-stdlib-shim.cjs"

echo "╔═══════════════════════════════════════════════════════╗"
echo "║  TSN CLI Benchmarks: Node vs Bun vs TSN vs Rust  ║"
echo "║  5 runs per case, median wall time + peak RSS        ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

now_ns() { python3 -c 'import time; print(int(time.time_ns()))'; }
resolve_binary() { python3 -c 'import os,sys; print(os.path.realpath(sys.argv[1]))' "$1"; }

RUST_FLAGS="-C opt-level=3 -C lto=fat -C codegen-units=1 -C panic=abort -C strip=symbols"
RUST_SRC="$(pwd)/harness/rust"

# ─── Generate missing test data ────────────────────────────────────
DATA="harness/test-data"
N=500000

gen() { local f="$1"; shift; if [ ! -f "$f" ]; then echo "Generating $f..."; python3 -c "$@"; fi; }

gen "$DATA/large.csv" "
import csv, random; random.seed(42)
names=['Alice','Bob','Charlie','Diana','Eve','Frank','Grace','Hank','Iris','Jack']
cities=['NYC','SF','LA','Chicago','Seattle','Austin','Denver','Boston','Miami','Portland']
w=csv.writer(open('$DATA/large.csv','w')); w.writerow(['name','age','score','city'])
for i in range($N*2): w.writerow([random.choice(names),random.randint(18,65),round(random.uniform(0,100),2),random.choice(cities)])
"

gen "$DATA/large-config-audit.env" "
import random; random.seed(43)
keys=['APP_ENV','API_BASE_URL','ENABLE_AUDIT_LOG','SESSION_COOKIE_SECURE','FEATURE_FLAGS',
      'ALLOWED_ORIGINS','DATABASE_URL','CACHE_REDIS_URL','LOG_LEVEL','MAX_POOL_SIZE',
      'RATE_LIMIT','CORS_ENABLED','TLS_VERSION','SENTRY_DSN','DEPLOY_REGION']
vals=['production','staging','true','false','https://api.example.com','redis://cache:6379',
      'postgresql://db:5432/app','1.3','us-east-1','eu-west-1','debug','info','warn']
f=open('$DATA/large-config-audit.env','w')
for i in range($N):
    k=random.choice(keys)+'_'+str(i)
    f.write(k+' = '+random.choice(vals)+'\n')
"

gen "$DATA/large-access-log.txt" "
import random; random.seed(44)
methods=['GET','GET','GET','POST','PUT','DELETE']
paths=['/health','/api/orders','/api/users','/checkout','/auth/login','/search','/api/products','/api/cart']
services=['api','checkout','auth','search','queue','payments']
statuses=[200,200,200,200,200,502,503,404]
f=open('$DATA/large-access-log.txt','w')
for i in range($N):
    ts='2026-04-05T%02d:%02d:%02dZ'%(i//3600%24,i//60%60,i%60)
    f.write('%s|%s|%s|%d|%d|%s\n'%(ts,random.choice(methods),random.choice(paths),random.choice(statuses),random.randint(5,980),random.choice(services)))
"

gen "$DATA/large-log-triage.txt" "
import random; random.seed(45)
levels=['ERROR','ERROR','WARN','WARN','WARN','INFO','INFO','INFO','INFO','INFO']
services=['checkout','auth','search','queue','api','payments','gateway']
regions=['iad','fra','sin','pdx','lhr']
msgs=['Payment timeout retry storm on card capture','Token refresh backlog after deploy',
      'Cache warmed successfully','Queue depth exceeded threshold','Connection pool exhausted',
      'Request latency spike on /checkout','Auth token validation slow','Search index rebuild in progress',
      'Rate limiter triggered for IP range','Disk usage warning on shard 3','Memory pressure on worker pool',
      'TLS handshake timeout to upstream','DNS resolution slow for cache host','Deployment rollback initiated']
f=open('$DATA/large-log-triage.txt','w')
for i in range($N):
    ts='2026-04-05T%02d:%02d:%02dZ'%(i//3600%24,i//60%60,i%60)
    f.write('%s level=%s service=%s region=%s msg=%s\n'%(ts,random.choice(levels),random.choice(services),random.choice(regions),random.choice(msgs)))
"

gen "$DATA/large-revenue-rollup.csv" "
import csv, random; random.seed(46)
regions=['north','south','west','east','enterprise','apac','emea','latam','central','midwest']
w=csv.writer(open('$DATA/large-revenue-rollup.csv','w')); w.writerow(['region','revenue','cost','orders'])
for i in range($N):
    rev=round(random.uniform(50000,200000),2); cost=round(rev*random.uniform(0.55,0.75),2)
    w.writerow([random.choice(regions),rev,cost,random.randint(200,600)])
"

gen "$DATA/large-sla-scorecard.csv" "
import csv, random; random.seed(47)
services=['checkout','auth','api','search','queue','payments','gateway','cdn','dns','logging']
w=csv.writer(open('$DATA/large-sla-scorecard.csv','w')); w.writerow(['service','uptime','error_rate','p95_ms','deploys'])
for i in range($N):
    w.writerow([random.choice(services),round(random.uniform(98.0,99.99),2),round(random.uniform(0.05,2.0),2),random.randint(400,1000),random.randint(5,30)])
"

echo "Binary sizes:"
echo "  Node runtime:    $(ls -lh "$(resolve_binary "$(which node)")" | awk '{print $5}')"
if command -v bun &> /dev/null; then
    echo "  Bun runtime:     $(ls -lh "$(resolve_binary "$(which bun)")" | awk '{print $5}')"
else
    echo "  Bun runtime:     not installed"
fi
if command -v rustc &> /dev/null; then
    echo "  Rust compiler:   $(rustc --version | awk '{print $2}')"
else
    echo "  Rust compiler:   not installed"
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
    local rust_name="$7"
    local size
    size=$(ls -lh "$input" | awk '{print $5}')

    # Build Rust binary if source exists
    local rust_binary="./build/${rust_name}-rs"
    local rust_src="$RUST_SRC/${rust_name}.rs"
    if [ -f "$rust_src" ] && command -v rustc &> /dev/null; then
        rustc $RUST_FLAGS -o "$rust_binary" "$rust_src" 2>/dev/null
    fi

    echo "━━━ $title ━━━"
    echo "  $summary"
    echo "  Input: $records records, $size"
    if [ -f "$binary" ]; then
        echo "  TSN binary: $(ls -lh "$binary" | awk '{print $5}')"
    else
        echo "  TSN binary: not built"
    fi
    if [ -f "$rust_binary" ]; then
        echo "  Rust binary: $(ls -lh "$rust_binary" | awk '{print $5}')"
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
        run_bench "TSN" "$input" "$records" "$binary"
    else
        printf "  %-12s %6s     %4s     %s\n" "TSN" "---" "---" "not built"
    fi

    if [ -f "$rust_binary" ]; then
        run_bench "Rust" "$input" "$records" "$rust_binary"
    else
        printf "  %-12s %6s     %4s     %s\n" "Rust" "---" "---" "not built"
    fi

    echo ""
}

bench_case \
    "CSV Tool" \
    "Process 1M CSV rows: filter age>30, sort by score, output top 20." \
    "targets/csv-tool.ts" \
    "./build/csv-tool" \
    "$DATA/large.csv" \
    "$(record_count_csv $DATA/large.csv)" \
    "csv-tool"

bench_case \
    "Config Audit" \
    "Audit 500K deployment-style env config entries for risky flags." \
    "examples/config-audit.ts" \
    "./build/config-audit" \
    "$DATA/large-config-audit.env" \
    "$(record_count_lines $DATA/large-config-audit.env)" \
    "config-audit"

bench_case \
    "Access Log Summary" \
    "Summarize 500K access log entries into health signals and hot paths." \
    "examples/access-log-summary.ts" \
    "./build/access-log-summary" \
    "$DATA/large-access-log.txt" \
    "$(record_count_lines $DATA/large-access-log.txt)" \
    "access-log-summary"

bench_case \
    "Log Triage" \
    "Triage 500K production log lines and extract actionable incident counts." \
    "examples/log-triage.ts" \
    "./build/log-triage" \
    "$DATA/large-log-triage.txt" \
    "$(record_count_lines $DATA/large-log-triage.txt)" \
    "log-triage"

bench_case \
    "Revenue Rollup" \
    "Roll up 500K revenue entries by region with margin and top performers." \
    "examples/revenue-rollup.ts" \
    "./build/revenue-rollup" \
    "$DATA/large-revenue-rollup.csv" \
    "$(record_count_csv $DATA/large-revenue-rollup.csv)" \
    "revenue-rollup"

bench_case \
    "SLA Scorecard" \
    "Aggregate 500K SLA snapshots into per-service uptime and latency reports." \
    "examples/sla-scorecard.ts" \
    "./build/sla-scorecard" \
    "$DATA/large-sla-scorecard.csv" \
    "$(record_count_csv $DATA/large-sla-scorecard.csv)" \
    "sla-scorecard"

echo ""
echo "Time is total wall time from invocation to exit. Memory is peak RSS. Throughput is input records processed per second."
