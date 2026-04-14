#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NATIVE="$ROOT/native/target/release"

echo "── Go dev setup ──"

# Build native if needed
if [ ! -f "$NATIVE/libwebycash_sdk.dylib" ] && [ ! -f "$NATIVE/libwebycash_sdk.so" ]; then
    echo "Building native library..."
    cd "$ROOT/native" && cargo build --release
fi

cd "$ROOT/go"

case "$(uname -s)" in
    Linux)
        export CGO_LDFLAGS="-L$NATIVE"
        export LD_LIBRARY_PATH="$NATIVE:${LD_LIBRARY_PATH:-}"
        ;;
    Darwin)
        export CGO_LDFLAGS="-L$NATIVE"
        export DYLD_LIBRARY_PATH="$NATIVE:${DYLD_LIBRARY_PATH:-}"
        ;;
esac

go build .
echo "Done. Test: CGO_LDFLAGS=\"-L$NATIVE\" go run ."
