#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NATIVE="$ROOT/native/target/release"

echo "── Kotlin/Java dev setup ──"

# Build native if needed
if [ ! -f "$NATIVE/libwebycash_sdk.dylib" ] && [ ! -f "$NATIVE/libwebycash_sdk.so" ]; then
    echo "Building native library..."
    cd "$ROOT/native" && cargo build --release
fi

cd "$ROOT/kotlin"

if command -v gradle >/dev/null 2>&1; then
    gradle build
    echo "Done. Test: gradle run -Djna.library.path=$NATIVE"
elif [ -f gradlew ]; then
    ./gradlew build
    echo "Done. Test: ./gradlew run -Djna.library.path=$NATIVE"
else
    echo "SKIP: gradle not found. Install via: brew install gradle"
fi

echo "JNA library path: -Djna.library.path=$NATIVE"
