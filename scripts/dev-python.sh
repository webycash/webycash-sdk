#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NATIVE="$ROOT/native/target/release"

echo "── Python dev setup ──"

# Build native if needed
if [ ! -f "$NATIVE/libwebycash_sdk.dylib" ] && [ ! -f "$NATIVE/libwebycash_sdk.so" ]; then
    echo "Building native library..."
    cd "$ROOT/native" && cargo build --release
fi

# Copy native lib into Python package
case "$(uname -s)" in
    Linux)  cp "$NATIVE/libwebycash_sdk.so" "$ROOT/python/webycash_sdk/" ;;
    Darwin) cp "$NATIVE/libwebycash_sdk.dylib" "$ROOT/python/webycash_sdk/" ;;
esac

# Install in editable mode
cd "$ROOT/python"
pip install -e . 2>/dev/null || pip3 install -e .

echo "Done. Test: python3 -c \"import webycash_sdk; print(webycash_sdk.version())\""
