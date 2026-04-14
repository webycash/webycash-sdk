#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NATIVE="$ROOT/native/target/release"

echo "── Node.js dev setup ──"

# Build native if needed
if [ ! -f "$NATIVE/libwebycash_sdk.dylib" ] && [ ! -f "$NATIVE/libwebycash_sdk.so" ]; then
    echo "Building native library..."
    cd "$ROOT/native" && cargo build --release
fi

# Copy native lib
case "$(uname -s)" in
    Linux)  cp "$NATIVE/libwebycash_sdk.so" "$ROOT/node/" ;;
    Darwin) cp "$NATIVE/libwebycash_sdk.dylib" "$ROOT/node/" ;;
esac

cd "$ROOT/node"
npm install
npm run build

echo "Done. Test: node -e \"const sdk = require('./dist'); console.log(sdk.version())\""
