#!/bin/bash
set -euo pipefail

# webycash-sdk dev setup — builds native lib and installs all bindings locally
# Usage: ./scripts/dev-setup.sh

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "=== webycash-sdk dev setup ==="
echo "Root: $ROOT"

# ── 1. Build native library ─────────────────────────────────────────
echo ""
echo "── Building native library (release) ──"
cd "$ROOT/native"
cargo build --release
NATIVE_DIR="$ROOT/native/target/release"

# Detect platform library name
case "$(uname -s)" in
    Linux)  LIB_NAME="libwebycash_sdk.so" ;;
    Darwin) LIB_NAME="libwebycash_sdk.dylib" ;;
    MINGW*|MSYS*|CYGWIN*) LIB_NAME="webycash_sdk.dll" ;;
    *) echo "Unsupported OS: $(uname -s)"; exit 1 ;;
esac

if [ ! -f "$NATIVE_DIR/$LIB_NAME" ]; then
    echo "ERROR: $NATIVE_DIR/$LIB_NAME not found after build"
    exit 1
fi
echo "Built: $NATIVE_DIR/$LIB_NAME"

# ── 2. Python ────────────────────────────────────────────────────────
echo ""
echo "── Installing Python binding (dev mode) ──"
cp "$NATIVE_DIR/$LIB_NAME" "$ROOT/python/webycash_sdk/"
cd "$ROOT/python"
pip install -e . 2>/dev/null || pip3 install -e . 2>/dev/null || echo "SKIP: pip not found"
echo "Python: import webycash_sdk"

# ── 3. Node.js / TypeScript ──────────────────────────────────────────
echo ""
echo "── Installing Node.js binding (dev mode) ──"
cp "$NATIVE_DIR/$LIB_NAME" "$ROOT/node/"
cd "$ROOT/node"
if command -v npm >/dev/null 2>&1; then
    npm install
    npm run build
    echo "Node.js: require('webycash-sdk')"
else
    echo "SKIP: npm not found"
fi

# ── 4. Go ────────────────────────────────────────────────────────────
echo ""
echo "── Setting up Go binding ──"
echo "Go: set CGO_LDFLAGS and LD_LIBRARY_PATH/DYLD_LIBRARY_PATH"
echo "  export CGO_LDFLAGS=\"-L$NATIVE_DIR\""
case "$(uname -s)" in
    Linux)  echo "  export LD_LIBRARY_PATH=\"$NATIVE_DIR:\$LD_LIBRARY_PATH\"" ;;
    Darwin) echo "  export DYLD_LIBRARY_PATH=\"$NATIVE_DIR:\$DYLD_LIBRARY_PATH\"" ;;
esac

# ── 5. C# / .NET ────────────────────────────────────────────────────
echo ""
echo "── Setting up C# binding ──"
if command -v dotnet >/dev/null 2>&1; then
    cd "$ROOT/csharp"
    dotnet build -c Debug 2>/dev/null || echo "SKIP: dotnet build failed (need native lib in path)"
    echo "C#: place $LIB_NAME next to the binary or in system lib path"
else
    echo "SKIP: dotnet not found"
fi

# ── 6. Kotlin / Java ────────────────────────────────────────────────
echo ""
echo "── Setting up Kotlin/Java binding ──"
echo "JNA loads libwebycash_sdk from java.library.path"
echo "  export JAVA_OPTS=\"-Djna.library.path=$NATIVE_DIR\""

# ── 7. Swift ─────────────────────────────────────────────────────────
echo ""
echo "── Setting up Swift binding ──"
echo "Swift SPM: add to Package.swift dependencies"
echo "  .package(path: \"$ROOT/swift\")"
echo "  Link against $NATIVE_DIR/$LIB_NAME"

# ── 8. C/C++ ─────────────────────────────────────────────────────────
echo ""
echo "── Setting up C/C++ binding ──"
echo "Include: $ROOT/include/webycash.h"
echo "C++ wrapper: $ROOT/cpp/include/webycash_sdk.hpp"
echo "Link: -L$NATIVE_DIR -lwebycash_sdk"

# ── Summary ──────────────────────────────────────────────────────────
echo ""
echo "=== Dev setup complete ==="
echo ""
echo "Native library: $NATIVE_DIR/$LIB_NAME"
echo ""
echo "Quick test commands:"
echo "  python3 -c \"import webycash_sdk; print(webycash_sdk.version())\""
echo "  node -e \"const w = require('./node/dist'); console.log(w.version())\""
echo "  cd go && CGO_LDFLAGS=\"-L$NATIVE_DIR\" go run ."
