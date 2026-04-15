# Changelog

## 0.2.7

- Remove committed native `.dylib` artifacts from VCS; ignore `*.dylib` / `*.so` / `*.dll`.
- Add offline FFI smoke tests for Python, Node.js, Go, C#, Kotlin, Java, C++, and Swift.
- Add CI job `test-bindings` (macOS + `aarch64-apple-darwin` artifact); publish jobs wait on tests.
- Add `python/README.md` for PyPI long description.
- Document API version string example updated to match release train.

## 0.2.6

- NuGet signing and Trusted Publishing (OIDC); version alignment across packages.

## 0.2.5

- NuGet Trusted Publishing user configuration fixes.

## 0.2.4

- Pin `webylib` to `0.2` line for native crate; dependency resolution updates.

## 0.2.3

- NuGet Trusted Publishing workflow adjustments.

## 0.2.2

- CocoaPods `--use-libraries` for FFI pod.

## 0.2.1

- NuGet signed push and Swift packaging naming.

## 0.2.0

- NuGet signed packages; CocoaPods Swift naming fixes.

## 0.1.x

- Initial multi-registry releases: npm, PyPI, NuGet, Maven Central, crates.io (`webycash-sdk` native crate), CocoaPods.
- FFI header `webycash.h`, bindings for Rust (via `webylib`), Swift, Kotlin/Java (JNA), C#, Python, Node (koffi), Go (cgo), C++.
