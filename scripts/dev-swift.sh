#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NATIVE="$ROOT/native/target/release"

echo "── Swift dev setup ──"

# Build native if needed
if [ ! -f "$NATIVE/libwebycash_sdk.dylib" ] && [ ! -f "$NATIVE/libwebycash_sdk.a" ]; then
    echo "Building native library..."
    cd "$ROOT/native" && cargo build --release
fi

cd "$ROOT/swift"

# SPM resolve (won't compile without linking, but validates package structure)
swift package resolve 2>/dev/null || true

echo "Done."
echo "To use in Xcode: add package dependency with path: $ROOT/swift"
echo "Link against: $NATIVE/libwebycash_sdk.a (static) or .dylib (dynamic)"
echo "Library search path: $NATIVE"
