#!/bin/bash
# ─── Native GUI Build Harness ──────────────────────────────────────
# Smoke-tests all maintained TSX apps in release and debug mode.

set -e
cd "$(dirname "$0")/.."

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

PASS=0
FAIL=0

build_case() {
  local label="$1"
  shift
  local log="/tmp/$(echo "$label" | tr ' /' '__').log"

  if ./tsn build "$@" > "$log" 2>&1; then
    echo -e "  ${GREEN}PASS${NC} $label"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}FAIL${NC} $label"
    tail -20 "$log"
    FAIL=$((FAIL + 1))
  fi
}

echo "╔═══════════════════════════════════════════════╗"
echo "║  TSN Native GUI: Build Harness           ║"
echo "╚═══════════════════════════════════════════════╝"

echo ""
echo "━━━ dashboard ━━━"
build_case "dashboard release" "examples/native-gui/dashboard.tsx"
build_case "dashboard debug" "examples/native-gui/dashboard.tsx" --debug

echo ""
echo "━━━ incident-tracker ━━━"
build_case "incident-tracker release" "examples/native-gui/incident-tracker.tsx"
build_case "incident-tracker debug" "examples/native-gui/incident-tracker.tsx" --debug

echo ""
echo "━━━ app-store ━━━"
build_case "app-store release" "examples/native-gui/app-store.tsx"
build_case "app-store debug" "examples/native-gui/app-store.tsx" --debug

echo ""
echo "━━━ gallery ━━━"
build_case "gallery release" "conformance/gallery.tsx"
build_case "gallery debug" "conformance/gallery.tsx" --debug

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "Results: ${GREEN}${PASS} passed${NC}, ${RED}${FAIL} failed${NC}"

if [ $FAIL -gt 0 ]; then
  exit 1
fi
