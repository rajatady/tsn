#!/bin/bash
# ─── Correctness Test Harness ───────────────────────────────────────
# Runs each target with Node, Bun, and (if compiled) native binary.
# Diffs output against expected. PASS/FAIL for each.
#
# This is the guardrail. If correctness fails, nothing else matters.

set -e
cd "$(dirname "$0")/.."

JS_STDLIB_SHIM="$(pwd)/harness/js-stdlib-shim.cjs"

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

run_target() {
  local name="$1"
  local input="$2"  # empty string if no stdin needed

  echo ""
  echo "━━━ $name ━━━"

  # Node.js
  if [ -n "$input" ]; then
    NODE_OPTIONS="--require=$JS_STDLIB_SHIM" npx tsx "targets/$name.ts" < "$input" > "/tmp/tsn-$name-node.txt" 2>&1
  else
    NODE_OPTIONS="--require=$JS_STDLIB_SHIM" npx tsx "targets/$name.ts" > "/tmp/tsn-$name-node.txt" 2>&1
  fi
  check "Node.js" "/tmp/tsn-$name-node.txt" "harness/expected/$name.expected.txt"

  # Bun
  if command -v bun &> /dev/null; then
    if [ -n "$input" ]; then
      bun --preload "$JS_STDLIB_SHIM" "targets/$name.ts" < "$input" > "/tmp/tsn-$name-bun.txt" 2>&1
    else
      bun --preload "$JS_STDLIB_SHIM" "targets/$name.ts" > "/tmp/tsn-$name-bun.txt" 2>&1
    fi
    check "Bun    " "/tmp/tsn-$name-bun.txt" "harness/expected/$name.expected.txt"
  else
    echo -e "  ${YELLOW}SKIP${NC} Bun (not installed)"
    SKIP=$((SKIP + 1))
  fi

  # Native binary
  if [ -f "build/$name" ]; then
    if [ -n "$input" ]; then
      "./build/$name" < "$input" > "/tmp/tsn-$name-native.txt" 2>&1
    else
      "./build/$name" > "/tmp/tsn-$name-native.txt" 2>&1
    fi
    check "Native " "/tmp/tsn-$name-native.txt" "harness/expected/$name.expected.txt"
  else
    echo -e "  ${YELLOW}SKIP${NC} Native (not compiled yet → build/$name)"
    SKIP=$((SKIP + 1))
  fi
}

echo "╔═══════════════════════════════════════════════╗"
echo "║  TSN → Native: Correctness Tests         ║"
echo "╚═══════════════════════════════════════════════╝"

run_target "json-pipeline" "harness/test-data/large-dataset.json"
run_target "http-router" ""
run_target "markdown-parser" "harness/test-data/sample.md"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "Results: ${GREEN}${PASS} passed${NC}, ${RED}${FAIL} failed${NC}, ${YELLOW}${SKIP} skipped${NC}"

if [ $FAIL -gt 0 ]; then
  exit 1
fi
