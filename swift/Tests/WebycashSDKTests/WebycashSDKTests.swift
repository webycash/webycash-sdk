import XCTest
import WebycashSDK

/// XCTestCase defines `version` in newer SDKs; avoid shadowing top-level `version()`.
private func sdkVersion() -> String { version() }

private func sdkAmountParse(_ s: String) throws -> Int64 { try amountParse(s) }

private func sdkAmountFormat(_ w: Int64) throws -> String { try amountFormat(w) }

final class WebycashSDKTests: XCTestCase {
    func testVersion() {
        XCTAssertFalse(sdkVersion().isEmpty)
    }

    func testAmountRoundtrip() throws {
        XCTAssertEqual(try sdkAmountParse("1.5"), 150_000_000)
        XCTAssertEqual(try sdkAmountFormat(150_000_000), "1.5")
        XCTAssertEqual(try sdkAmountParse("0.00000001"), 1)
        XCTAssertEqual(try sdkAmountFormat(1), "0.00000001")
    }

    func testWalletOpenBalanceClose() throws {
        let dir = FileManager.default.temporaryDirectory
        let url = dir.appendingPathComponent("webycash-test-\(UUID().uuidString).db")
        let path = url.path
        let w = try Wallet(path: path)
        defer {
            w.close()
            try? FileManager.default.removeItem(at: url)
        }
        let b = try w.balance()
        XCTAssertFalse(b.isEmpty)
    }
}
