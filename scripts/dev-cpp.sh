#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NATIVE="$ROOT/native/target/release"

echo "── C/C++ dev setup ──"

# Build native if needed
if [ ! -f "$NATIVE/libwebycash_sdk.dylib" ] && [ ! -f "$NATIVE/libwebycash_sdk.so" ]; then
    echo "Building native library..."
    cd "$ROOT/native" && cargo build --release
fi

echo "Done."
echo ""
echo "C header:     $ROOT/include/webycash.h"
echo "C++ wrapper:  $ROOT/cpp/include/webycash_sdk.hpp"
echo "Library:      $NATIVE/libwebycash_sdk.{a,so,dylib}"
echo ""
echo "Compile example:"
echo "  g++ -std=c++17 -I$ROOT/cpp/include -I$ROOT/include -L$NATIVE -lwebycash_sdk example.cpp -o example"
echo ""
echo "Run:"
case "$(uname -s)" in
    Linux)  echo "  LD_LIBRARY_PATH=$NATIVE ./example" ;;
    Darwin) echo "  DYLD_LIBRARY_PATH=$NATIVE ./example" ;;
esac
