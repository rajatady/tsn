#!/bin/bash
#
# Build the StrictTS Native Dashboard
#
# Flow:
#   dashboard.ts  →  (StrictTS compiler)  →  dashboard.c  →  (clang)  →  ./dashboard
#
# For now, dashboard.c is hand-maintained to match dashboard.ts.
# Once the compiler supports ui_* bindings, this becomes:
#   node ../../compiler/index.ts dashboard.ts
#   clang ... build/dashboard.c framework/ui.m -o build/dashboard
#

set -e

cd "$(dirname "$0")"

echo "=== StrictTS Native Dashboard Build ==="
echo ""

# Build
echo "Compiling dashboard.c + framework/ui.m → dashboard..."
clang -O2 -fobjc-arc \
    -framework Cocoa \
    -framework QuartzCore \
    dashboard.c \
    framework/ui.m \
    -o ../../build/dashboard

SIZE=$(ls -lh ../../build/dashboard | awk '{print $5}')
echo "  Binary: ../../build/dashboard ($SIZE)"
echo "  Architecture: $(file ../../build/dashboard | grep -o 'arm64\|x86_64')"
echo ""

# Compare to Electron
echo "=== Size Comparison ==="
echo "  StrictTS Native:  $SIZE"
echo "  Electron hello:   ~180 MB"
echo "  Tauri hello:      ~12 MB"
echo "  Swift/SwiftUI:    ~200 KB"
echo ""

# Run
echo "Launching dashboard..."
../../build/dashboard &
PID=$!
echo "  PID: $PID"
echo ""
echo "Dashboard running. Press Ctrl+C to stop."
wait $PID
