import Foundation
import CWebycashSDK

public enum WebycashError: Error, LocalizedError {
    case ffi(code: Int32, message: String)
    public var errorDescription: String? {
        switch self { case .ffi(_, let msg): return msg }
    }
}

private func ffiCheck(_ rc: Int32) throws {
    guard rc == 0 else {
        let msg = weby_last_error_message().flatMap { String(cString: $0) } ?? "Unknown error"
        throw WebycashError.ffi(code: rc, message: msg)
    }
}

private func takeString(_ ptr: UnsafeMutablePointer<CChar>?) -> String {
    guard let p = ptr else { return "" }
    let s = String(cString: p)
    weby_free_string(p)
    return s
}

/// Webcash wallet backed by SQLite.
public final class Wallet {
    private var ptr: OpaquePointer?

    /// Open or create a wallet at `path`.
    public init(path: String) throws {
        var out: OpaquePointer?
        try ffiCheck(weby_wallet_open(path, &out))
        self.ptr = out
    }

    /// Open or create a wallet with a caller-provided 32-byte seed.
    public init(path: String, seed: Data) throws {
        guard seed.count == 32 else { throw WebycashError.ffi(code: 1, message: "Seed must be 32 bytes") }
        var out: OpaquePointer?
        try seed.withUnsafeBytes { buf in
            try ffiCheck(weby_wallet_open_with_seed(path, buf.baseAddress!.assumingMemoryBound(to: UInt8.self), seed.count, &out))
        }
        self.ptr = out
    }

    deinit { close() }

    public func close() {
        if let p = ptr { weby_wallet_free(p); ptr = nil }
    }

    public func balance() throws -> String {
        var out: UnsafeMutablePointer<CChar>?
        try ffiCheck(weby_wallet_balance(ptr, &out))
        return takeString(out)
    }

    public func insert(_ webcash: String) throws {
        try ffiCheck(weby_wallet_insert(ptr, webcash))
    }

    public func pay(amount: String, memo: String = "") throws -> String {
        var out: UnsafeMutablePointer<CChar>?
        try ffiCheck(weby_wallet_pay(ptr, amount, memo, &out))
        return takeString(out)
    }

    public func check() throws {
        try ffiCheck(weby_wallet_check(ptr))
    }

    public func merge(maxOutputs: UInt32 = 20) throws -> String {
        var out: UnsafeMutablePointer<CChar>?
        try ffiCheck(weby_wallet_merge(ptr, maxOutputs, &out))
        return takeString(out)
    }

    public func recover(masterSecretHex: String, gapLimit: UInt32 = 20) throws -> String {
        var out: UnsafeMutablePointer<CChar>?
        try ffiCheck(weby_wallet_recover(ptr, masterSecretHex, gapLimit, &out))
        return takeString(out)
    }

    public func stats() throws -> String {
        var out: UnsafeMutablePointer<CChar>?
        try ffiCheck(weby_wallet_stats(ptr, &out))
        return takeString(out)
    }

    public func exportSnapshot() throws -> String {
        var out: UnsafeMutablePointer<CChar>?
        try ffiCheck(weby_wallet_export_snapshot(ptr, &out))
        return takeString(out)
    }

    public func encryptSeed(password: String) throws {
        try ffiCheck(weby_wallet_encrypt_seed(ptr, password))
    }

    public func importSnapshot(_ json: String) throws {
        try ffiCheck(weby_wallet_import_snapshot(ptr, json))
    }

    public func listWebcash() throws -> String {
        var out: UnsafeMutablePointer<CChar>?
        try ffiCheck(weby_wallet_list_webcash(ptr, &out))
        return takeString(out)
    }

    public func masterSecret() throws -> String {
        var out: UnsafeMutablePointer<CChar>?
        try ffiCheck(weby_wallet_master_secret(ptr, &out))
        return takeString(out)
    }

    public func encryptWithPassword(_ password: String) throws -> String {
        var out: UnsafeMutablePointer<CChar>?
        try ffiCheck(weby_wallet_encrypt_with_password(ptr, password, &out))
        return takeString(out)
    }

    public func decryptWithPassword(encryptedJSON: String, password: String) throws {
        try ffiCheck(weby_wallet_decrypt_with_password(ptr, encryptedJSON, password))
    }

    public func recoverFromWallet(gapLimit: UInt32 = 20) throws -> String {
        var out: UnsafeMutablePointer<CChar>?
        try ffiCheck(weby_wallet_recover_from_wallet(ptr, gapLimit, &out))
        return takeString(out)
    }
}

/// Get the library version.
public func version() -> String {
    String(cString: weby_version())
}

/// Parse a decimal amount string to integer wats.
public func amountParse(_ s: String) throws -> Int64 {
    var out: Int64 = 0
    try ffiCheck(weby_amount_parse(s, &out))
    return out
}

/// Format integer wats as a decimal string.
public func amountFormat(_ wats: Int64) throws -> String {
    var out: UnsafeMutablePointer<CChar>?
    try ffiCheck(weby_amount_format(wats, &out))
    return takeString(out)
}
