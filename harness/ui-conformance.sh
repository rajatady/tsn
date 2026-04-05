#!/bin/bash

set -e
cd "$(dirname "$0")/.."

npx tsx harness/ui-conformance.ts
