#!/bin/bash
# ─── CLI Example Correctness Harness ───────────────────────────────
# Runs real-world CLI examples with Node, Bun, and native binaries.

set -e
cd "$(dirname "$0")/.."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

PASS=0
FAIL=0
SKIP=0

check() {
  local label="$1"
  local actual="$2"
  local expected="$3"

  if diff -q "$actual" "$expected" > /dev/null 2>&1; then
    echo -e "  ${GREEN}PASS${NC} $label"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}FAIL${NC} $label"
    echo "  First diff:"
    diff "$expected" "$actual" | head -5
    FAIL=$((FAIL + 1))
  fi
}

run_case() {
  local name="$1"
  local source="$2"
  local input="$3"
  local expected="$4"
  local base
  local binary

  base="$(basename "$source")"
  base="${base%.tsx}"
  base="${base%.ts}"
  binary="build/$base"

  echo ""
  echo "━━━ $name ━━━"

  npx tsx "$source" < "$input" > "/tmp/strictts-$name-node.txt" 2>&1
  check "Node.js" "/tmp/strictts-$name-node.txt" "$expected"

  if command -v bun &> /dev/null; then
    bun "$source" < "$input" > "/tmp/strictts-$name-bun.txt" 2>&1
    check "Bun    " "/tmp/strictts-$name-bun.txt" "$expected"
  else
    echo -e "  ${YELLOW}SKIP${NC} Bun (not installed)"
    SKIP=$((SKIP + 1))
  fi

  if ./strictts build "$source" > "/tmp/strictts-$name-build.txt" 2>&1; then
    "$binary" < "$input" > "/tmp/strictts-$name-native.txt" 2>&1
    check "Native " "/tmp/strictts-$name-native.txt" "$expected"
  else
    echo -e "  ${RED}FAIL${NC} Native build"
    tail -20 "/tmp/strictts-$name-build.txt"
    FAIL=$((FAIL + 1))
  fi
}

echo "╔═══════════════════════════════════════════════╗"
echo "║  StrictTS CLI Examples: Correctness Tests     ║"
echo "╚═══════════════════════════════════════════════╝"

run_case "config-audit" "examples/config-audit.ts" "harness/test-data/config-audit.env" "harness/expected/config-audit.expected.txt"
run_case "access-log-summary" "examples/access-log-summary.ts" "harness/test-data/access-log.txt" "harness/expected/access-log-summary.expected.txt"
run_case "log-triage" "examples/log-triage.ts" "harness/test-data/log-triage.txt" "harness/expected/log-triage.expected.txt"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "Results: ${GREEN}${PASS} passed${NC}, ${RED}${FAIL} failed${NC}, ${YELLOW}${SKIP} skipped${NC}"

if [ $FAIL -gt 0 ]; then
  exit 1
fi
