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

echo "╔═══════════════════════════════════════════════════════╗"
echo "║  TSN → Native: Benchmarks                       ║"
echo "║  ${ITERATIONS} iterations, median, nanosecond precision          ║"
echo "╚═══════════════════════════════════════════════════════╝"

echo ""
echo "Core targets"
bench_case "json-pipeline" "targets/json-pipeline.ts" "harness/test-data/large-dataset.json" "json-pipeline" "./build/baseline-json-pipeline"
bench_case "http-router" "targets/http-router.ts" "" "http-router" "./build/baseline-http-router"
bench_case "markdown-parser" "targets/markdown-parser.ts" "harness/test-data/sample.md" "markdown-parser" "./build/baseline-markdown-parser"
bench_case "csv-tool" "targets/csv-tool.ts" "$DATA/large.csv" "csv-tool" ""

echo ""
echo "Real-world CLI examples"
bench_case "config-audit" "examples/config-audit.ts" "$DATA/large-config-audit.env" "config-audit" ""
bench_case "access-log-summary" "examples/access-log-summary.ts" "$DATA/large-access-log.txt" "access-log-summary" ""
bench_case "log-triage" "examples/log-triage.ts" "$DATA/large-log-triage.txt" "log-triage" ""
bench_case "revenue-rollup" "examples/revenue-rollup.ts" "$DATA/large-revenue-rollup.csv" "revenue-rollup" ""
bench_case "sla-scorecard" "examples/sla-scorecard.ts" "$DATA/large-sla-scorecard.csv" "sla-scorecard" ""

echo ""
echo "Done."
