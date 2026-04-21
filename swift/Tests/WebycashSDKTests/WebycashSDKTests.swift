import Foundation
import XCTest
import WebycashSDK

/// XCTestCase defines `version` in newer SDKs; avoid shadowing top-level `version()`.
private func sdkVersion() -> String { version() }

private func sdkAmountParse(_ s: String) throws -> Int64 { try amountParse(s) }

private func sdkAmountFormat(_ w: Int64) throws -> String { try amountFormat(w) }

/// Create a temporary .db path and return (path, URL) for cleanup.
private func tmpWalletPath() -> (String, URL) {
    let dir = FileManager.default.temporaryDirectory
    let url = dir.appendingPathComponent("webycash-test-\(UUID().uuidString).db")
    return (url.path, url)
}

final class WebycashSDKTests: XCTestCase {

    // 1. test_version
    func testVersion() {
        let v = sdkVersion()
        XCTAssertFalse(v.isEmpty)
    }

    // 2. test_amount_roundtrip
    func testAmountRoundtrip() throws {
        XCTAssertEqual(try sdkAmountParse("1.5"), 150_000_000)
        XCTAssertEqual(try sdkAmountFormat(150_000_000), "1.5")
        XCTAssertEqual(try sdkAmountParse("0.00000001"), 1)
        XCTAssertEqual(try sdkAmountFormat(1), "0.00000001")
    }

    // 3. test_wallet_open_balance_close
    func testWalletOpenBalanceClose() throws {
        let (path, url) = tmpWalletPath()
        let w = try Wallet(path: path)
        defer {
            w.close()
            try? FileManager.default.removeItem(at: url)
        }
        let b = try w.balance()
        XCTAssertTrue(b == "0" || b == "0.00000000", "expected zero balance, got \"\(b)\"")
    }

    // 4. test_export_import_snapshot
    func testExportImportSnapshot() throws {
        let (path1, url1) = tmpWalletPath()
        let (path2, url2) = tmpWalletPath()
        defer {
            try? FileManager.default.removeItem(at: url1)
            try? FileManager.default.removeItem(at: url2)
        }

        let snapshot: String
        do {
            let w1 = try Wallet(path: path1)
            defer { w1.close() }
            snapshot = try w1.exportSnapshot()
            XCTAssertFalse(snapshot.isEmpty)
        }

        do {
            let w2 = try Wallet(path: path2)
            defer { w2.close() }
            try w2.importSnapshot(snapshot)
            let snap2 = try w2.exportSnapshot()
            // Compare snapshots via parsed JSON (key order may differ)
            let d1 = snapshot.data(using: .utf8)!
            let d2 = snap2.data(using: .utf8)!
            let j1 = try JSONSerialization.jsonObject(with: d1) as! [String: Any]
            let j2 = try JSONSerialization.jsonObject(with: d2) as! [String: Any]
            XCTAssertEqual(j1["master_secret"] as? String, j2["master_secret"] as? String,
                           "master_secret mismatch after import/export roundtrip")
            let b = try w2.balance()
            XCTAssertTrue(b == "0" || b == "0.00000000", "expected zero balance after import, got \"\(b)\"")
        }
    }

    // 5. test_list_webcash_empty
    func testListWebcashEmpty() throws {
        let (path, url) = tmpWalletPath()
        let w = try Wallet(path: path)
        defer {
            w.close()
            try? FileManager.default.removeItem(at: url)
        }
        let list = try w.listWebcash()
        XCTAssertEqual(list, "[]")
    }

    // 6. test_master_secret_format
    func testMasterSecretFormat() throws {
        let (path, url) = tmpWalletPath()
        let w = try Wallet(path: path)
        defer {
            w.close()
            try? FileManager.default.removeItem(at: url)
        }
        let secret = try w.masterSecret()
        XCTAssertEqual(secret.count, 64)
        XCTAssertTrue(secret.allSatisfy { $0.isHexDigit })
    }

    // 7. test_master_secret_deterministic
    func testMasterSecretDeterministic() throws {
        let seed = Data(repeating: 0x42, count: 32)

        let (path1, url1) = tmpWalletPath()
        let (path2, url2) = tmpWalletPath()
        defer {
            try? FileManager.default.removeItem(at: url1)
            try? FileManager.default.removeItem(at: url2)
        }

        let w1 = try Wallet(path: path1, seed: seed)
        defer { w1.close() }
        let secret1 = try w1.masterSecret()

        let w2 = try Wallet(path: path2, seed: seed)
        defer { w2.close() }
        let secret2 = try w2.masterSecret()

        XCTAssertEqual(secret1, secret2)
        XCTAssertEqual(secret1.count, 64)
    }

    // 8. test_encrypt_decrypt_password
    func testEncryptDecryptPassword() throws {
        let (path, url) = tmpWalletPath()
        let w = try Wallet(path: path)
        defer {
            w.close()
            try? FileManager.default.removeItem(at: url)
        }

        let secretBefore = try w.masterSecret()
        let encrypted = try w.encryptWithPassword("hunter2")
        XCTAssertFalse(encrypted.isEmpty)

        try w.decryptWithPassword(encryptedJSON: encrypted, password: "hunter2")
        let secretAfter = try w.masterSecret()
        XCTAssertEqual(secretBefore, secretAfter)
    }

    // 9. test_recover_from_wallet_empty
    func testRecoverFromWalletEmpty() throws {
        let (path, url) = tmpWalletPath()
        let w = try Wallet(path: path)
        defer {
            w.close()
            try? FileManager.default.removeItem(at: url)
        }
        // Should not crash on an empty wallet; network errors are acceptable offline.
        do {
            let result = try w.recoverFromWallet(gapLimit: 5)
            XCTAssertFalse(result.isEmpty)
        } catch let error as WebycashError {
            let msg = "\(error)".lowercased()
            XCTAssertTrue(
                msg.contains("network") || msg.contains("connection") ||
                msg.contains("resolve") || msg.contains("dns") ||
                msg.contains("http") || msg.contains("request"),
                "unexpected non-network error: \(error)")
        }
    }

    // 10. test_import_invalid_json
    func testImportInvalidJson() throws {
        let (path, url) = tmpWalletPath()
        let w = try Wallet(path: path)
        defer {
            w.close()
            try? FileManager.default.removeItem(at: url)
        }
        XCTAssertThrowsError(try w.importSnapshot("not valid json")) { error in
            XCTAssertTrue(error is WebycashError)
        }
    }
}
