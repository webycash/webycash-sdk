# Changelog

## 0.1.0

Initial release — complete SDK with WASM + FFI across 9 languages.

- **WASM**: Full WebAssembly support for browser and Node.js. `wasm/` crate built with `wasm-pack`.
- **Node.js**: Async API with dual FFI/WASM backend. ESM package. Auto-detects best backend.
- **All 9 languages**: Complete wallet API — open, balance, insert, pay, check, merge, recover, stats, exportSnapshot, importSnapshot, listWebcash, masterSecret, encryptWithPassword, decryptWithPassword, recoverFromWallet, encryptSeed.
- **Standalone utilities** (Node.js/WASM): deriveSecret, generateMasterSecret, sha256Hex, secretToPublic, parseWebcash, formatWebcash, formatPublicWebcash, amountParse, amountFormat.
- **Bindings**: Python (ctypes), Swift (SPM), Kotlin (JNA), Java (JNA), C# (P/Invoke), Go (cgo), C++ (header-only).
- **CI**: Native builds for linux-x64, linux-arm64, macos-x64, macos-arm64, windows-x64, iOS, Android. WASM build. Publish to npm, PyPI, NuGet, Maven Central, crates.io, CocoaPods.
- **Tests**: 10 offline smoke tests per language (90 total).
- **webylib**: Pinned to 0.3.12.
