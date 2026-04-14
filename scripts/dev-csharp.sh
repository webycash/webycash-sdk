#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NATIVE="$ROOT/native/target/release"

echo "── C# dev setup ──"

# Build native if needed
if [ ! -f "$NATIVE/libwebycash_sdk.dylib" ] && [ ! -f "$NATIVE/libwebycash_sdk.so" ]; then
    echo "Building native library..."
    cd "$ROOT/native" && cargo build --release
fi

# Copy native lib next to project
case "$(uname -s)" in
    Linux)  cp "$NATIVE/libwebycash_sdk.so" "$ROOT/csharp/" ;;
    Darwin) cp "$NATIVE/libwebycash_sdk.dylib" "$ROOT/csharp/" ;;
esac

cd "$ROOT/csharp"
dotnet build -c Debug

echo "Done. Native lib copied to csharp/. Run: dotnet run --project csharp/"
