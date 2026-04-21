#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "── Building WASM ──"
cd "$ROOT/wasm"
wasm-pack build --target web --out-dir "$ROOT/node/wasm" --release

# Clean wasm-pack generated files we don't need
rm -f "$ROOT/node/wasm/.gitignore"
rm -f "$ROOT/node/wasm/package.json"
rm -f "$ROOT/node/wasm/README.md"

echo "WASM built: $ROOT/node/wasm/"
ls -lh "$ROOT/node/wasm/"
