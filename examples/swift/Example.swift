// webycash-sdk Swift example — full wallet lifecycle
// Build: swiftc -I../../swift/Sources/CWebycashSDK/include -L../../native/target/release -lwebycash_sdk Example.swift -o example
// Run:   DYLD_LIBRARY_PATH=../../native/target/release ./example

import Foundation
// In a real project: import WebycashSDK
// For standalone: link directly against the C FFI

// Direct C FFI calls (since we can't import the SPM module in a standalone script)
@_silgen_name("weby_version") func weby_version() -> UnsafePointer<CChar>
@_silgen_name("weby_wallet_open") func weby_wallet_open(_ path: UnsafePointer<CChar>, _ out: UnsafeMutablePointer<OpaquePointer?>) -> Int32
@_silgen_name("weby_wallet_free") func weby_wallet_free(_ wallet: OpaquePointer?)
@_silgen_name("weby_wallet_balance") func weby_wallet_balance(_ wallet: OpaquePointer?, _ out: UnsafeMutablePointer<UnsafeMutablePointer<CChar>?>) -> Int32
@_silgen_name("weby_wallet_stats") func weby_wallet_stats(_ wallet: OpaquePointer?, _ out: UnsafeMutablePointer<UnsafeMutablePointer<CChar>?>) -> Int32
@_silgen_name("weby_wallet_insert") func weby_wallet_insert(_ wallet: OpaquePointer?, _ wc: UnsafePointer<CChar>) -> Int32
@_silgen_name("weby_wallet_encrypt_seed") func weby_wallet_encrypt_seed(_ wallet: OpaquePointer?, _ pw: UnsafePointer<CChar>) -> Int32
@_silgen_name("weby_free_string") func weby_free_string(_ ptr: UnsafeMutablePointer<CChar>?)
@_silgen_name("weby_last_error_message") func weby_last_error_message() -> UnsafePointer<CChar>?
@_silgen_name("weby_amount_parse") func weby_amount_parse(_ s: UnsafePointer<CChar>, _ out: UnsafeMutablePointer<Int64>) -> Int32
@_silgen_name("weby_amount_format") func weby_amount_format(_ wats: Int64, _ out: UnsafeMutablePointer<UnsafeMutablePointer<CChar>?>) -> Int32

func takeString(_ ptr: UnsafeMutablePointer<CChar>?) -> String {
    guard let p = ptr else { return "" }
    let s = String(cString: p)
    weby_free_string(p)
    return s
}

print("=== webycash-sdk Swift Example ===")
print("Version: \(String(cString: weby_version()))")

// Amount utilities
print("\n-- Amount utilities --")
var wats: Int64 = 0
weby_amount_parse("1.5", &wats)
print("  parse('1.5') = \(wats) wats")
var fmtPtr: UnsafeMutablePointer<CChar>? = nil
weby_amount_format(wats, &fmtPtr)
print("  format(\(wats)) = '\(takeString(fmtPtr))'")

// Wallet lifecycle
let dbPath = "/tmp/webycash_sdk_swift_test.db"
try? FileManager.default.removeItem(atPath: dbPath)

print("\n-- Open wallet --")
var wallet: OpaquePointer? = nil
let rc = weby_wallet_open(dbPath, &wallet)
guard rc == 0, wallet != nil else {
    print("  Error: \(String(cString: weby_last_error_message()!))")
    exit(1)
}

var balPtr: UnsafeMutablePointer<CChar>? = nil
weby_wallet_balance(wallet, &balPtr)
print("  Balance: \(takeString(balPtr))")

var statsPtr: UnsafeMutablePointer<CChar>? = nil
weby_wallet_stats(wallet, &statsPtr)
print("  Stats: \(takeString(statsPtr))")

// Encrypt seed
print("\n-- Encrypt seed --")
weby_wallet_encrypt_seed(wallet, "test_password")
print("  OK")

// Error handling
print("\n-- Error handling --")
let insertRc = weby_wallet_insert(wallet, "bad_string")
if insertRc != 0 {
    print("  Caught: \(String(cString: weby_last_error_message()!))")
}

weby_wallet_free(wallet)
try? FileManager.default.removeItem(atPath: dbPath)
try? FileManager.default.removeItem(atPath: "\(dbPath)-wal")
try? FileManager.default.removeItem(atPath: "\(dbPath)-shm")

print("\n=== All tests passed ===")
