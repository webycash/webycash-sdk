// webycash-sdk Swift example — complete webcash protocol demonstration
// Build: swiftc -I../../swift/Sources/CWebycashSDK/include -L../../native/target/release -lwebycash_sdk Example.swift -o example
// Run:   DYLD_LIBRARY_PATH=../../native/target/release ./example

import Foundation
// In a real project: import WebycashSDK
// For standalone: link directly against the C FFI

// ── C FFI declarations ─────────────────────────────────────────

@_silgen_name("weby_version") func weby_version() -> UnsafePointer<CChar>
@_silgen_name("weby_wallet_open") func weby_wallet_open(_ path: UnsafePointer<CChar>, _ out: UnsafeMutablePointer<OpaquePointer?>) -> Int32
@_silgen_name("weby_wallet_free") func weby_wallet_free(_ wallet: OpaquePointer?)
@_silgen_name("weby_wallet_balance") func weby_wallet_balance(_ wallet: OpaquePointer?, _ out: UnsafeMutablePointer<UnsafeMutablePointer<CChar>?>) -> Int32
@_silgen_name("weby_wallet_stats") func weby_wallet_stats(_ wallet: OpaquePointer?, _ out: UnsafeMutablePointer<UnsafeMutablePointer<CChar>?>) -> Int32
@_silgen_name("weby_wallet_insert") func weby_wallet_insert(_ wallet: OpaquePointer?, _ wc: UnsafePointer<CChar>) -> Int32
@_silgen_name("weby_wallet_pay") func weby_wallet_pay(_ wallet: OpaquePointer?, _ amount: UnsafePointer<CChar>, _ memo: UnsafePointer<CChar>?, _ out: UnsafeMutablePointer<UnsafeMutablePointer<CChar>?>) -> Int32
@_silgen_name("weby_wallet_check") func weby_wallet_check(_ wallet: OpaquePointer?) -> Int32
@_silgen_name("weby_wallet_merge") func weby_wallet_merge(_ wallet: OpaquePointer?, _ maxOutputs: UInt32, _ out: UnsafeMutablePointer<UnsafeMutablePointer<CChar>?>) -> Int32
@_silgen_name("weby_wallet_recover") func weby_wallet_recover(_ wallet: OpaquePointer?, _ hex: UnsafePointer<CChar>, _ gap: UInt32, _ out: UnsafeMutablePointer<UnsafeMutablePointer<CChar>?>) -> Int32
@_silgen_name("weby_wallet_export_snapshot") func weby_wallet_export_snapshot(_ wallet: OpaquePointer?, _ out: UnsafeMutablePointer<UnsafeMutablePointer<CChar>?>) -> Int32
@_silgen_name("weby_wallet_import_snapshot") func weby_wallet_import_snapshot(_ wallet: OpaquePointer?, _ json: UnsafePointer<CChar>) -> Int32
@_silgen_name("weby_wallet_list_webcash") func weby_wallet_list_webcash(_ wallet: OpaquePointer?, _ out: UnsafeMutablePointer<UnsafeMutablePointer<CChar>?>) -> Int32
@_silgen_name("weby_wallet_master_secret") func weby_wallet_master_secret(_ wallet: OpaquePointer?, _ out: UnsafeMutablePointer<UnsafeMutablePointer<CChar>?>) -> Int32
@_silgen_name("weby_wallet_encrypt_seed") func weby_wallet_encrypt_seed(_ wallet: OpaquePointer?, _ pw: UnsafePointer<CChar>) -> Int32
@_silgen_name("weby_wallet_encrypt_with_password") func weby_wallet_encrypt_with_password(_ wallet: OpaquePointer?, _ pw: UnsafePointer<CChar>, _ out: UnsafeMutablePointer<UnsafeMutablePointer<CChar>?>) -> Int32
@_silgen_name("weby_wallet_decrypt_with_password") func weby_wallet_decrypt_with_password(_ wallet: OpaquePointer?, _ json: UnsafePointer<CChar>, _ pw: UnsafePointer<CChar>) -> Int32
@_silgen_name("weby_wallet_recover_from_wallet") func weby_wallet_recover_from_wallet(_ wallet: OpaquePointer?, _ gap: UInt32, _ out: UnsafeMutablePointer<UnsafeMutablePointer<CChar>?>) -> Int32
@_silgen_name("weby_free_string") func weby_free_string(_ ptr: UnsafeMutablePointer<CChar>?)
@_silgen_name("weby_last_error_message") func weby_last_error_message() -> UnsafePointer<CChar>?
@_silgen_name("weby_amount_parse") func weby_amount_parse(_ s: UnsafePointer<CChar>, _ out: UnsafeMutablePointer<Int64>) -> Int32
@_silgen_name("weby_amount_format") func weby_amount_format(_ wats: Int64, _ out: UnsafeMutablePointer<UnsafeMutablePointer<CChar>?>) -> Int32

// ── Helpers ────────────────────────────────────────────────────

struct WebycashError: Error, CustomStringConvertible {
    let code: Int32
    let message: String
    var description: String { "WebycashError(code=\(code)): \(message)" }
}

func ffiCheck(_ rc: Int32) throws {
    guard rc == 0 else {
        let msg = weby_last_error_message().map { String(cString: $0) } ?? "Unknown error"
        throw WebycashError(code: rc, message: msg)
    }
}

func takeString(_ ptr: UnsafeMutablePointer<CChar>?) -> String {
    guard let p = ptr else { return "" }
    let s = String(cString: p)
    weby_free_string(p)
    return s
}

func cleanupDb(_ path: String) {
    for suffix in ["", "-wal", "-shm"] {
        try? FileManager.default.removeItem(atPath: path + suffix)
    }
}

// ── Main ───────────────────────────────────────────────────────

do {
    print("=== webycash-sdk Swift Example ===")

    // ── 1. Version & utilities ─────────────────────────────────
    print("\n── Version & utilities ──")
    print("  Library version: \(String(cString: weby_version()))")

    var wats: Int64 = 0
    try ffiCheck(weby_amount_parse("1.5", &wats))
    print("  parse('1.5') = \(wats) wats")
    assert(wats == 150_000_000, "Expected 150000000 wats")

    var fmtPtr: UnsafeMutablePointer<CChar>? = nil
    try ffiCheck(weby_amount_format(wats, &fmtPtr))
    let formatted = takeString(fmtPtr)
    print("  format(\(wats)) = '\(formatted)'")
    assert(formatted == "1.5", "Expected '1.5'")
    print("  OK")

    // ── 2. Create wallet ───────────────────────────────────────
    let tmpDir = FileManager.default.temporaryDirectory.path
    let dbPath = "\(tmpDir)/webycash_sdk_swift_example.db"
    cleanupDb(dbPath)

    print("\n── Create wallet ──")
    var wallet: OpaquePointer? = nil
    try ffiCheck(weby_wallet_open(dbPath, &wallet))
    print("  Opened: \(dbPath)")

    // ── 3. Master secret backup ────────────────────────────────
    // The master secret is the 64-hex HD root; write it down for disaster recovery.
    print("\n── Master secret backup ──")
    var secretPtr: UnsafeMutablePointer<CChar>? = nil
    try ffiCheck(weby_wallet_master_secret(wallet, &secretPtr))
    let masterSecret = takeString(secretPtr)
    print("  Master secret: \(masterSecret.prefix(16))... (\(masterSecret.count) hex chars)")
    assert(masterSecret.count == 64, "Expected 64 hex chars")
    print("  OK")

    // ── 4. Balance & stats ─────────────────────────────────────
    print("\n── Balance & stats ──")
    var balPtr: UnsafeMutablePointer<CChar>? = nil
    try ffiCheck(weby_wallet_balance(wallet, &balPtr))
    let balance = takeString(balPtr)
    print("  Balance: \(balance)")
    assert(balance == "0", "Fresh wallet should have zero balance")

    var statsPtr: UnsafeMutablePointer<CChar>? = nil
    try ffiCheck(weby_wallet_stats(wallet, &statsPtr))
    let stats = takeString(statsPtr)
    print("  Stats: \(stats)")
    // Stats is JSON with unspent_webcash, total_received, etc.
    assert(stats.contains("unspent_webcash"), "Stats should contain unspent_webcash")
    print("  OK")

    // ── 5. List outputs ────────────────────────────────────────
    print("\n── List outputs ──")
    var listPtr: UnsafeMutablePointer<CChar>? = nil
    try ffiCheck(weby_wallet_list_webcash(wallet, &listPtr))
    let wcList = takeString(listPtr)
    print("  Unspent outputs (empty wallet): \(wcList)")
    // Empty wallet returns "[]"
    assert(wcList == "[]", "Empty wallet should have no outputs")
    print("  OK")

    // ── 6. Snapshot backup ─────────────────────────────────────
    // Export is a JSON blob containing master_secret + all wallet state.
    print("\n── Snapshot backup ──")
    var snapPtr: UnsafeMutablePointer<CChar>? = nil
    try ffiCheck(weby_wallet_export_snapshot(wallet, &snapPtr))
    let snapshot = takeString(snapPtr)
    print("  Snapshot: \(snapshot.count) chars")
    assert(snapshot.count > 0, "Snapshot should not be empty")
    // Verify it parses as JSON
    let snapData = snapshot.data(using: .utf8)!
    let snapJson = try JSONSerialization.jsonObject(with: snapData) as! [String: Any]
    assert(snapJson["master_secret"] != nil, "Snapshot should contain master_secret")
    print("  Contains master_secret: yes")
    print("  OK")

    // ── 7. Snapshot restore ────────────────────────────────────
    // Import the snapshot into a fresh second wallet to verify portability.
    print("\n── Snapshot restore ──")
    let db2Path = "\(tmpDir)/webycash_sdk_swift_example_restore.db"
    cleanupDb(db2Path)

    var wallet2: OpaquePointer? = nil
    try ffiCheck(weby_wallet_open(db2Path, &wallet2))
    try ffiCheck(weby_wallet_import_snapshot(wallet2, snapshot))
    print("  Imported snapshot into second wallet")

    var bal2Ptr: UnsafeMutablePointer<CChar>? = nil
    try ffiCheck(weby_wallet_balance(wallet2, &bal2Ptr))
    print("  Second wallet balance: \(takeString(bal2Ptr))")

    // Verify master secrets match
    var secret2Ptr: UnsafeMutablePointer<CChar>? = nil
    try ffiCheck(weby_wallet_master_secret(wallet2, &secret2Ptr))
    let secret2 = takeString(secret2Ptr)
    assert(secret2 == masterSecret, "Restored wallet should have same master secret")
    print("  Master secrets match: yes")
    print("  OK")

    weby_wallet_free(wallet2)
    wallet2 = nil
    cleanupDb(db2Path)

    // ── 8. Password encryption ─────────────────────────────────
    // encryptWithPassword() serializes the wallet into an encrypted JSON blob.
    // decryptWithPassword() restores from that blob.
    print("\n── Password encryption ──")
    let password = "correct-horse-battery-staple"

    var encPtr: UnsafeMutablePointer<CChar>? = nil
    try ffiCheck(weby_wallet_encrypt_with_password(wallet, password, &encPtr))
    let encrypted = takeString(encPtr)
    print("  Encrypted blob: \(encrypted.count) chars")
    assert(encrypted.count > 0, "Encrypted blob should not be empty")

    try ffiCheck(weby_wallet_decrypt_with_password(wallet, encrypted, password))
    print("  Decrypted successfully")

    // Verify wallet still works after decrypt
    var balAfterPtr: UnsafeMutablePointer<CChar>? = nil
    try ffiCheck(weby_wallet_balance(wallet, &balAfterPtr))
    print("  Balance after decrypt: \(takeString(balAfterPtr))")

    // Also test the legacy encrypt_seed
    try ffiCheck(weby_wallet_encrypt_seed(wallet, "seed-password"))
    print("  Seed encryption: OK")
    print("  OK")

    // ── 9. Server operations ───────────────────────────────────
    // These require a live webcash server and a valid webcash string.
    // Set TEST_WEBCASH env var to a secret webcash string to enable.
    if let testWc = ProcessInfo.processInfo.environment["TEST_WEBCASH"] {
        // 9a. Insert webcash (receive)
        print("\n── Insert webcash ──")
        print("  Inserting: \(testWc.prefix(30))...")
        try ffiCheck(weby_wallet_insert(wallet, testWc))
        var balInsPtr: UnsafeMutablePointer<CChar>? = nil
        try ffiCheck(weby_wallet_balance(wallet, &balInsPtr))
        print("  Balance after insert: \(takeString(balInsPtr))")

        // 9b. Pay amount (send)
        print("\n── Pay ──")
        do {
            var payPtr: UnsafeMutablePointer<CChar>? = nil
            try ffiCheck(weby_wallet_pay(wallet, "0.00000001", "swift-test", &payPtr))
            let payResult = takeString(payPtr)
            let limit = min(60, payResult.count)
            print("  Payment: \(payResult.prefix(limit))...")
        } catch let e as WebycashError {
            print("  Pay skipped: \(e.message)")
        }

        // 9c. Check wallet against server
        print("\n── Check ──")
        do {
            try ffiCheck(weby_wallet_check(wallet))
            print("  Check: OK")
        } catch let e as WebycashError {
            print("  Check: \(e.message)")
        }

        // 9d. Merge outputs
        print("\n── Merge ──")
        do {
            var mergePtr: UnsafeMutablePointer<CChar>? = nil
            try ffiCheck(weby_wallet_merge(wallet, 20, &mergePtr))
            print("  Merge: \(takeString(mergePtr))")
        } catch let e as WebycashError {
            print("  Merge skipped: \(e.message)")
        }

        // 9e. List outputs, get stats
        print("\n── List outputs & stats ──")
        var listAfterPtr: UnsafeMutablePointer<CChar>? = nil
        try ffiCheck(weby_wallet_list_webcash(wallet, &listAfterPtr))
        let afterList = takeString(listAfterPtr)
        let afterListData = afterList.data(using: .utf8)!
        let afterListArr = try JSONSerialization.jsonObject(with: afterListData) as! [Any]
        print("  Unspent outputs: \(afterListArr.count)")

        var statsAfterPtr: UnsafeMutablePointer<CChar>? = nil
        try ffiCheck(weby_wallet_stats(wallet, &statsAfterPtr))
        print("  Stats: \(takeString(statsAfterPtr))")
    } else {
        print("\n── Server operations ──")
        print("  Skipped (set TEST_WEBCASH env var to enable)")
    }

    // ── 10. Recovery ───────────────────────────────────────────
    // recoverFromWallet() re-derives keys from the stored master secret
    // and scans the server for any webcash belonging to this wallet.
    print("\n── Recovery ──")
    do {
        var recoverPtr: UnsafeMutablePointer<CChar>? = nil
        try ffiCheck(weby_wallet_recover_from_wallet(wallet, 20, &recoverPtr))
        print("  recoverFromWallet: \(takeString(recoverPtr))")
    } catch let e as WebycashError {
        // Expected to fail without a server connection
        print("  recoverFromWallet: \(e.message)")
    }

    // ── Error handling ─────────────────────────────────────────
    print("\n── Error handling ──")
    do {
        try ffiCheck(weby_wallet_insert(wallet, "invalid_webcash_string"))
        print("  ERROR: should have thrown")
    } catch let e as WebycashError {
        print("  Caught expected error: code=\(e.code) msg=\(e.message)")
    }

    // ── 11. Cleanup ────────────────────────────────────────────
    print("\n── Cleanup ──")
    weby_wallet_free(wallet)
    wallet = nil
    cleanupDb(dbPath)
    print("  Wallet closed and temp files removed")

    print("\n=== All tests passed ===")

} catch {
    print("FATAL: \(error)")
    exit(1)
}
