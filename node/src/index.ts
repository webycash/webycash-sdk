import koffi from "koffi";
import path from "path";
import os from "os";

const LIB_NAME: Record<string, string> = {
  linux: "libwebycash_sdk.so",
  darwin: "libwebycash_sdk.dylib",
  win32: "webycash_sdk.dll",
};

function findLib(): string {
  const name = LIB_NAME[os.platform()];
  if (!name) throw new Error(`Unsupported platform: ${os.platform()}`);
  // Check next to this module first
  const local = path.join(__dirname, "..", name);
  try { require("fs").accessSync(local); return local; } catch {}
  return name; // Fall back to system search
}

const lib = koffi.load(findLib());

// ── FFI declarations ────────────────────────────────────────────

const WebyWalletPtr = koffi.pointer("WebyWallet", koffi.opaque());
const WebyWalletPtrPtr = koffi.pointer(WebyWalletPtr);
const CharPtrPtr = koffi.pointer("char*", koffi.pointer(koffi.types.char));

const ffi = {
  weby_wallet_open: lib.func("int32_t weby_wallet_open(const char*, _Out_ WebyWallet**)"),
  weby_wallet_open_with_seed: lib.func("int32_t weby_wallet_open_with_seed(const char*, const uint8_t*, size_t, _Out_ WebyWallet**)"),
  weby_wallet_free: lib.func("void weby_wallet_free(WebyWallet*)"),
  weby_wallet_balance: lib.func("int32_t weby_wallet_balance(const WebyWallet*, _Out_ char**)"),
  weby_wallet_insert: lib.func("int32_t weby_wallet_insert(const WebyWallet*, const char*)"),
  weby_wallet_pay: lib.func("int32_t weby_wallet_pay(const WebyWallet*, const char*, const char*, _Out_ char**)"),
  weby_wallet_check: lib.func("int32_t weby_wallet_check(const WebyWallet*)"),
  weby_wallet_merge: lib.func("int32_t weby_wallet_merge(const WebyWallet*, uint32_t, _Out_ char**)"),
  weby_wallet_recover: lib.func("int32_t weby_wallet_recover(const WebyWallet*, const char*, uint32_t, _Out_ char**)"),
  weby_wallet_stats: lib.func("int32_t weby_wallet_stats(const WebyWallet*, _Out_ char**)"),
  weby_wallet_export_snapshot: lib.func("int32_t weby_wallet_export_snapshot(const WebyWallet*, _Out_ char**)"),
  weby_wallet_encrypt_seed: lib.func("int32_t weby_wallet_encrypt_seed(const WebyWallet*, const char*)"),
  weby_version: lib.func("const char* weby_version()"),
  weby_last_error_message: lib.func("const char* weby_last_error_message()"),
  weby_amount_parse: lib.func("int32_t weby_amount_parse(const char*, _Out_ int64_t*)"),
  weby_amount_format: lib.func("int32_t weby_amount_format(int64_t, _Out_ char**)"),
  weby_free_string: lib.func("void weby_free_string(char*)"),
};

// ── Helpers ─────────────────────────────────────────────────────

export class WebycashError extends Error {
  constructor(public code: number, message: string) {
    super(message);
    this.name = "WebycashError";
  }
}

function check(rc: number): void {
  if (rc !== 0) {
    const msg = ffi.weby_last_error_message();
    throw new WebycashError(rc, msg ?? `Error code ${rc}`);
  }
}

function takeString(ptr: any): string {
  if (!ptr) return "";
  const s = koffi.decode(ptr, "char*") as string;
  ffi.weby_free_string(ptr);
  return s;
}

// ── Public API ──────────────────────────────────────────────────

export function version(): string {
  return ffi.weby_version();
}

export function amountParse(s: string): bigint {
  const out = [BigInt(0)];
  check(ffi.weby_amount_parse(s, out));
  return out[0] as bigint;
}

export function amountFormat(wats: bigint): string {
  const out = [null];
  check(ffi.weby_amount_format(wats, out));
  return takeString(out[0]);
}

export class Wallet {
  private ptr: any;

  constructor(dbPath: string, seed?: Buffer) {
    const out = [null];
    if (seed) {
      if (seed.length !== 32) throw new Error("seed must be 32 bytes");
      check(ffi.weby_wallet_open_with_seed(dbPath, seed, seed.length, out));
    } else {
      check(ffi.weby_wallet_open(dbPath, out));
    }
    this.ptr = out[0];
  }

  close(): void {
    if (this.ptr) {
      ffi.weby_wallet_free(this.ptr);
      this.ptr = null;
    }
  }

  balance(): string {
    const out = [null];
    check(ffi.weby_wallet_balance(this.ptr, out));
    return takeString(out[0]);
  }

  insert(webcash: string): void {
    check(ffi.weby_wallet_insert(this.ptr, webcash));
  }

  pay(amount: string, memo = ""): string {
    const out = [null];
    check(ffi.weby_wallet_pay(this.ptr, amount, memo, out));
    return takeString(out[0]);
  }

  check(): void {
    check(ffi.weby_wallet_check(this.ptr));
  }

  merge(maxOutputs = 20): string {
    const out = [null];
    check(ffi.weby_wallet_merge(this.ptr, maxOutputs, out));
    return takeString(out[0]);
  }

  recover(masterSecretHex: string, gapLimit = 20): string {
    const out = [null];
    check(ffi.weby_wallet_recover(this.ptr, masterSecretHex, gapLimit, out));
    return takeString(out[0]);
  }

  stats(): string {
    const out = [null];
    check(ffi.weby_wallet_stats(this.ptr, out));
    return takeString(out[0]);
  }

  exportSnapshot(): string {
    const out = [null];
    check(ffi.weby_wallet_export_snapshot(this.ptr, out));
    return takeString(out[0]);
  }

  encryptSeed(password: string): void {
    check(ffi.weby_wallet_encrypt_seed(this.ptr, password));
  }
}
