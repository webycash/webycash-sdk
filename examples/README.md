# Runnable SDK examples

Each example opens a temp wallet, exercises **amount helpers**, **open / balance / stats**, optional **insert → check → pay → merge → recover** when `TEST_WEBCASH` is set, plus **export snapshot**, **encrypt seed**, and **error handling**.

**Table of contents**

- [Python](#python) — [`python/example.py`](python/example.py)
- [Node.js](#nodejs) — [`node/example.cjs`](node/example.cjs)
- [Rust (webylib)](#rust-webylib) — [`rust/src/main.rs`](rust/src/main.rs)
- [Go](#go) — [`go/main.go`](go/main.go)
- [C# / .NET](#c--net) — [`csharp/Example.cs`](csharp/Example.cs)
- [Kotlin](#kotlin) — [`kotlin/Example.kt`](kotlin/Example.kt)
- [Java](#java) — [`java/Example.java`](java/Example.java)
- [Swift](#swift) — [`swift/Example.swift`](swift/Example.swift)
- [C++](#c) — [`cpp/example.cpp`](cpp/example.cpp)

**Environment**

| Variable | Effect |
|----------|--------|
| `TEST_WEBCASH` | Full bearer secret line (`e…:secret:…`). Enables insert and downstream server-backed calls. |

Native library: build `native/` (or use CI artifacts) and set `DYLD_LIBRARY_PATH` (macOS), `LD_LIBRARY_PATH` (Linux), or place `webycash_sdk` on the loader path / beside the app (Windows).

---

## Python

```bash
cd python
pip install webycash-sdk   # or install from a local wheel
python3 example.py
TEST_WEBCASH='e1.00000000:secret:…' python3 example.py
```

## Node.js

Uses the package under repo `node/` (run `npm install && npm run build` there first).

```bash
# from repository root
DYLD_LIBRARY_PATH=native/target/release node examples/node/example.cjs
TEST_WEBCASH='e1.00000000:secret:…' DYLD_LIBRARY_PATH=native/target/release node examples/node/example.cjs
```

## Rust (webylib)

Uses **`webylib`** directly (recommended for Rust). From `examples/rust`:

```bash
cargo run
TEST_WEBCASH='e1.00000000:secret:…' cargo run
```

## Go

From repo **`go/`** module root (see header comment in `go/main.go` for `CGO_LDFLAGS` and library path).

## C# / .NET

```bash
DYLD_LIBRARY_PATH=../../native/target/release dotnet run --project examples/csharp/Example.csproj
```

## Kotlin

Compile/run per comments in [`kotlin/Example.kt`](kotlin/Example.kt) (`jna.jar`, `-Djna.library.path=…`).

## Java

Compile/run per comments in [`java/Example.java`](java/Example.java).

## Swift

Standalone sample uses direct C FFI symbols (see build/run lines in [`swift/Example.swift`](swift/Example.swift)). For production, use the **`WebycashSDK`** SwiftPM target.

## C++

Compile/run per comments in [`cpp/example.cpp`](cpp/example.cpp).

---

**Docs:** [SDK developer page](https://weby.cash/developers/sdk) mirrors these flows with install steps per language.
