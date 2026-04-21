import type { Backend, WalletHandle } from "./backend.js";
import type {
  CheckResult,
  NetworkMode,
  ParsedWebcash,
  RecoveryResult,
  VerifyResult,
  WalletStats,
} from "./types.js";
import { WebycashError } from "./error.js";
import { WebycashErrorCode } from "./types.js";
import { createHash, randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { accessSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const esmRequire = createRequire(import.meta.url);

const LIB_NAME: Record<string, string> = {
  linux: "libwebycash_sdk.so",
  darwin: "libwebycash_sdk.dylib",
  win32: "webycash_sdk.dll",
};

function findLib(): string {
  const name = LIB_NAME[os.platform()];
  if (!name) throw new Error(`Unsupported platform: ${os.platform()}`);
  const local = path.join(__dirname, "..", name);
  try {
    accessSync(local);
    return local;
  } catch {
    /* fall through */
  }
  return name;
}

function check(rc: number): void {
  if (rc !== 0) {
    const msg = ffi!.weby_last_error_message();
    throw new WebycashError(rc as WebycashErrorCode, msg ?? `Error code ${rc}`);
  }
}

function takeString(val: unknown): string {
  if (val == null) return "";
  return String(val);
}

/** Parse "Recovery completed! Webcash recovered: N, Total amount: X" */
function parseRecoveryResult(s: string): RecoveryResult {
  const countMatch = s.match(/recovered:\s*(\d+)/i);
  const amountMatch = s.match(/amount:\s*([\d.]+)/i);
  return {
    recoveredCount: countMatch ? parseInt(countMatch[1], 10) : 0,
    totalAmount: amountMatch ? BigInt(Math.round(parseFloat(amountMatch[1]) * 1e8)) : 0n,
  };
}

function assertFfi(handle: WalletHandle): unknown {
  if (handle._tag !== "ffi") throw new Error("Expected FFI handle");
  return handle.ptr;
}

// Lazy-load koffi — singleton to avoid duplicate type registration
let ffi: Record<string, any> | null = null;
function loadFfi(): Record<string, any> {
  if (ffi) return ffi;
  const koffi = esmRequire("koffi");
  const lib = koffi.load(findLib());
  const WebyWalletPtr = koffi.pointer("WebyWallet", koffi.opaque());
  const bindings = {
    // Lifecycle
    weby_wallet_open: lib.func("int32_t weby_wallet_open(const char*, _Out_ WebyWallet**)"),
    weby_wallet_open_with_seed: lib.func("int32_t weby_wallet_open_with_seed(const char*, const uint8_t*, size_t, _Out_ WebyWallet**)"),
    weby_wallet_free: lib.func("void weby_wallet_free(WebyWallet*)"),
    // Operations
    weby_wallet_balance: lib.func("int32_t weby_wallet_balance(const WebyWallet*, _Out_ char**)"),
    weby_wallet_insert: lib.func("int32_t weby_wallet_insert(const WebyWallet*, const char*)"),
    weby_wallet_pay: lib.func("int32_t weby_wallet_pay(const WebyWallet*, const char*, const char*, _Out_ char**)"),
    weby_wallet_check: lib.func("int32_t weby_wallet_check(const WebyWallet*)"),
    weby_wallet_merge: lib.func("int32_t weby_wallet_merge(const WebyWallet*, uint32_t, _Out_ char**)"),
    weby_wallet_recover: lib.func("int32_t weby_wallet_recover(const WebyWallet*, const char*, uint32_t, _Out_ char**)"),
    weby_wallet_recover_from_wallet: lib.func("int32_t weby_wallet_recover_from_wallet(const WebyWallet*, uint32_t, _Out_ char**)"),
    // Inspection
    weby_wallet_stats: lib.func("int32_t weby_wallet_stats(const WebyWallet*, _Out_ char**)"),
    weby_wallet_export_snapshot: lib.func("int32_t weby_wallet_export_snapshot(const WebyWallet*, _Out_ char**)"),
    weby_wallet_import_snapshot: lib.func("int32_t weby_wallet_import_snapshot(const WebyWallet*, const char*)"),
    weby_wallet_list_webcash: lib.func("int32_t weby_wallet_list_webcash(const WebyWallet*, _Out_ char**)"),
    weby_wallet_master_secret: lib.func("int32_t weby_wallet_master_secret(const WebyWallet*, _Out_ char**)"),
    // Encryption
    weby_wallet_encrypt_seed: lib.func("int32_t weby_wallet_encrypt_seed(const WebyWallet*, const char*)"),
    weby_wallet_encrypt_with_password: lib.func("int32_t weby_wallet_encrypt_with_password(const WebyWallet*, const char*, _Out_ char**)"),
    weby_wallet_decrypt_with_password: lib.func("int32_t weby_wallet_decrypt_with_password(const WebyWallet*, const char*, const char*)"),
    // Utilities
    weby_version: lib.func("const char* weby_version()"),
    weby_last_error_message: lib.func("const char* weby_last_error_message()"),
    weby_amount_parse: lib.func("int32_t weby_amount_parse(const char*, _Out_ int64_t*)"),
    weby_amount_format: lib.func("int32_t weby_amount_format(int64_t, _Out_ char**)"),
    weby_free_string: lib.func("void weby_free_string(char*)"),
    WebyWalletPtr,
  };
  ffi = bindings;
  return bindings;
}

export class FfiBackend implements Backend {
  readonly name = "ffi" as const;

  static create(): FfiBackend {
    loadFfi();
    return new FfiBackend();
  }

  // ── Lifecycle ──────────────────────────────────────────────

  async walletOpen(dbPath: string, _network: NetworkMode, seed?: Uint8Array): Promise<WalletHandle> {
    const out = [null];
    if (seed) {
      if (seed.length !== 32) throw new WebycashError(WebycashErrorCode.InvalidInput, "seed must be 32 bytes");
      check(ffi!.weby_wallet_open_with_seed(dbPath, Buffer.from(seed), seed.length, out));
    } else {
      check(ffi!.weby_wallet_open(dbPath, out));
    }
    return { _tag: "ffi", ptr: out[0] };
  }

  walletClose(handle: WalletHandle): void {
    const ptr = assertFfi(handle);
    if (ptr) ffi!.weby_wallet_free(ptr);
  }

  // ── Operations ─────────────────────────────────────────────

  async walletBalance(handle: WalletHandle): Promise<string> {
    const out = [null];
    check(ffi!.weby_wallet_balance(assertFfi(handle), out));
    return takeString(out[0]);
  }

  async walletInsert(handle: WalletHandle, webcash: string): Promise<WalletHandle> {
    check(ffi!.weby_wallet_insert(assertFfi(handle), webcash));
    return handle;
  }

  async walletPay(handle: WalletHandle, amount: string, memo: string): Promise<{ handle: WalletHandle; paymentWebcash: string }> {
    const out = [null];
    check(ffi!.weby_wallet_pay(assertFfi(handle), amount, memo, out));
    return { handle, paymentWebcash: takeString(out[0]) };
  }

  async walletCheck(handle: WalletHandle): Promise<{ handle: WalletHandle; result: CheckResult }> {
    // FFI check() only returns success/failure — no detailed counts available via C ABI
    check(ffi!.weby_wallet_check(assertFfi(handle)));
    // Re-query stats to get actual counts post-check
    const stats = await this.walletStats(handle);
    return { handle, result: { validCount: stats.unspentWebcash, spentCount: stats.spentWebcash } };
  }

  async walletMerge(handle: WalletHandle, maxOutputs: number): Promise<{ handle: WalletHandle; message: string }> {
    const out = [null];
    check(ffi!.weby_wallet_merge(assertFfi(handle), maxOutputs, out));
    return { handle, message: takeString(out[0]) };
  }

  async walletRecover(handle: WalletHandle, masterSecretHex: string, gapLimit: number): Promise<{ handle: WalletHandle; result: RecoveryResult }> {
    const out = [null];
    check(ffi!.weby_wallet_recover(assertFfi(handle), masterSecretHex, gapLimit, out));
    return { handle, result: parseRecoveryResult(takeString(out[0])) };
  }

  async walletRecoverFromWallet(handle: WalletHandle, gapLimit: number): Promise<{ handle: WalletHandle; result: RecoveryResult }> {
    const out = [null];
    check(ffi!.weby_wallet_recover_from_wallet(assertFfi(handle), gapLimit, out));
    return { handle, result: parseRecoveryResult(takeString(out[0])) };
  }

  // ── Inspection ─────────────────────────────────────────────

  async walletStats(handle: WalletHandle): Promise<WalletStats> {
    const out = [null];
    check(ffi!.weby_wallet_stats(assertFfi(handle), out));
    const raw = JSON.parse(takeString(out[0]));
    return {
      totalWebcash: raw.total_webcash,
      unspentWebcash: raw.unspent_webcash,
      spentWebcash: raw.spent_webcash,
      totalBalance: raw.total_balance,
    };
  }

  async walletExportSnapshot(handle: WalletHandle): Promise<string> {
    const out = [null];
    check(ffi!.weby_wallet_export_snapshot(assertFfi(handle), out));
    return takeString(out[0]);
  }

  async walletImportSnapshot(handle: WalletHandle, json: string): Promise<WalletHandle> {
    check(ffi!.weby_wallet_import_snapshot(assertFfi(handle), json));
    return handle;
  }

  async walletListWebcash(handle: WalletHandle): Promise<string[]> {
    const out = [null];
    check(ffi!.weby_wallet_list_webcash(assertFfi(handle), out));
    return JSON.parse(takeString(out[0]));
  }

  async walletMasterSecret(handle: WalletHandle): Promise<string> {
    const out = [null];
    check(ffi!.weby_wallet_master_secret(assertFfi(handle), out));
    return takeString(out[0]);
  }

  // ── Encryption ─────────────────────────────────────────────

  async walletEncryptSeed(handle: WalletHandle, password: string): Promise<void> {
    check(ffi!.weby_wallet_encrypt_seed(assertFfi(handle), password));
  }

  async walletEncryptWithPassword(handle: WalletHandle, password: string): Promise<string> {
    const out = [null];
    check(ffi!.weby_wallet_encrypt_with_password(assertFfi(handle), password, out));
    return takeString(out[0]);
  }

  async walletDecryptWithPassword(handle: WalletHandle, encryptedJson: string, password: string): Promise<WalletHandle> {
    check(ffi!.weby_wallet_decrypt_with_password(assertFfi(handle), encryptedJson, password));
    return handle;
  }

  // ── Utilities ──────────────────────────────────────────────

  version(): string {
    return ffi!.weby_version();
  }

  amountParse(s: string): bigint {
    const out = [0];
    check(ffi!.weby_amount_parse(s, out));
    return BigInt(out[0]);
  }

  amountFormat(wats: bigint): string {
    const out = [null];
    check(ffi!.weby_amount_format(Number(wats), out));
    return takeString(out[0]);
  }

  // ── Crypto (pure Node.js — no FFI needed) ──────────────────

  deriveSecret(masterSecretHex: string, chainCode: number, depth: number): string {
    const masterBytes = Buffer.from(masterSecretHex, "hex");
    if (masterBytes.length !== 32) throw new WebycashError(WebycashErrorCode.InvalidInput, "master secret must be 32 bytes (64 hex chars)");
    const tag = createHash("sha256").update("webcashwalletv1").digest();
    const h = createHash("sha256");
    h.update(tag);
    h.update(tag);
    h.update(masterBytes);
    const chainBuf = Buffer.alloc(8);
    chainBuf.writeBigUInt64BE(BigInt(chainCode));
    h.update(chainBuf);
    const depthBuf = Buffer.alloc(8);
    depthBuf.writeBigUInt64BE(BigInt(depth));
    h.update(depthBuf);
    return h.digest("hex");
  }

  generateMasterSecret(): string {
    return randomBytes(32).toString("hex");
  }

  sha256Hex(data: string): string {
    return createHash("sha256").update(data, "ascii").digest("hex");
  }

  secretToPublic(secret: string): string {
    return this.sha256Hex(secret);
  }

  // ── Webcash (pure string ops) ──────────────────────────────

  parseWebcash(s: string): ParsedWebcash {
    const trimmed = s.trim();
    if (!trimmed.startsWith("e")) throw new WebycashError(WebycashErrorCode.InvalidInput, "webcash must start with 'e'");
    const parts = trimmed.slice(1).split(":");
    if (parts.length < 3 || parts[1] !== "secret") throw new WebycashError(WebycashErrorCode.InvalidInput, "invalid webcash format");
    const amountWats = this.amountParse(parts[0]);
    const secret = parts.slice(2).join(":");
    if (secret.length !== 64) throw new WebycashError(WebycashErrorCode.InvalidInput, "secret must be 64 hex characters");
    return {
      secret,
      amountWats,
      amountDisplay: this.amountFormat(amountWats),
      publicHash: this.secretToPublic(secret),
    };
  }

  formatWebcash(secret: string, amountWats: bigint): string {
    return `e${this.amountFormat(amountWats)}:secret:${secret}`;
  }

  formatPublicWebcash(hashHex: string, amountWats: bigint): string {
    return `e${this.amountFormat(amountWats)}:public:${hashHex}`;
  }
}
