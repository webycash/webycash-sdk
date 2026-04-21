import type { Backend, WalletHandle } from "./backend.js";
import type {
  CheckResult,
  NetworkMode,
  ParsedWebcash,
  RecoveryResult,
  WalletStats,
} from "./types.js";
import { WebycashError } from "./error.js";
import { WebycashErrorCode } from "./types.js";

type WasmModule = typeof import("../wasm/webycash_sdk_wasm.js");

function assertWasm(handle: WalletHandle): { stateJson: string; network: string } {
  if (handle._tag !== "wasm") throw new Error("Expected WASM handle");
  return handle;
}

function wrapError(err: unknown): never {
  const msg = err instanceof Error ? err.message : String(err);
  throw new WebycashError(WebycashErrorCode.Unknown, msg);
}

export class WasmBackend implements Backend {
  readonly name = "wasm" as const;
  private wasm: WasmModule;

  private constructor(wasm: WasmModule) {
    this.wasm = wasm;
  }

  static async create(): Promise<WasmBackend> {
    // Dynamic import for the WASM module
    let wasm: WasmModule;
    try {
      wasm = await import("../wasm/webycash_sdk_wasm.js");
    } catch {
      throw new WebycashError(
        WebycashErrorCode.NotSupported,
        "WASM module not found. Ensure the WASM package is built (scripts/build-wasm.sh)"
      );
    }

    // Initialize WASM (loads the .wasm binary)
    if (typeof wasm.default === "function") {
      // In Node.js, read the .wasm file from disk
      if (typeof process !== "undefined" && process.versions?.node) {
        const { readFile } = await import("node:fs/promises");
        const { fileURLToPath } = await import("node:url");
        const path = await import("node:path");
        const wasmDir = path.dirname(fileURLToPath(import.meta.url));
        const wasmPath = path.join(wasmDir, "..", "wasm", "webycash_sdk_wasm_bg.wasm");
        const wasmBytes = await readFile(wasmPath);
        await wasm.default(wasmBytes);
      } else {
        // Browser — let wasm-bindgen handle fetch
        await wasm.default();
      }
    }

    return new WasmBackend(wasm);
  }

  // ── Lifecycle ──────────────────────────────────────────────

  async walletOpen(_path: string, network: NetworkMode, seed?: Uint8Array): Promise<WalletHandle> {
    try {
      let stateJson: string;
      if (seed) {
        if (seed.length !== 32) throw new WebycashError(WebycashErrorCode.InvalidInput, "seed must be 32 bytes");
        const hex = Array.from(seed, (b) => b.toString(16).padStart(2, "0")).join("");
        stateJson = await this.wasm.wallet_create_with_secret(network, hex);
      } else {
        stateJson = this.wasm.wallet_create(network);
      }
      return { _tag: "wasm", stateJson, network };
    } catch (err) { wrapError(err); }
  }

  walletClose(_handle: WalletHandle): void {
    // WASM wallets are GC'd — no-op
  }

  // ── Operations ─────────────────────────────────────────────

  async walletBalance(handle: WalletHandle): Promise<string> {
    try {
      const { stateJson, network } = assertWasm(handle);
      const wats = this.wasm.wallet_balance(stateJson, network);
      return this.wasm.format_amount(wats);
    } catch (err) { wrapError(err); }
  }

  async walletInsert(handle: WalletHandle, webcash: string): Promise<WalletHandle> {
    try {
      const { stateJson, network } = assertWasm(handle);
      const newState = await this.wasm.wallet_insert(stateJson, network, webcash);
      return { _tag: "wasm", stateJson: newState, network };
    } catch (err) { wrapError(err); }
  }

  async walletPay(handle: WalletHandle, amount: string, _memo: string): Promise<{ handle: WalletHandle; paymentWebcash: string }> {
    try {
      const { stateJson, network } = assertWasm(handle);
      const amountWats = this.wasm.parse_amount(amount);
      const resultJson = await this.wasm.wallet_pay(stateJson, network, amountWats);
      const result = JSON.parse(resultJson);
      return {
        handle: { _tag: "wasm", stateJson: result.state, network },
        paymentWebcash: result.payment_webcash,
      };
    } catch (err) { wrapError(err); }
  }

  async walletCheck(handle: WalletHandle): Promise<{ handle: WalletHandle; result: CheckResult }> {
    try {
      const { stateJson, network } = assertWasm(handle);
      const resultJson = await this.wasm.wallet_check(stateJson, network);
      const result = JSON.parse(resultJson);
      return {
        handle: { _tag: "wasm", stateJson: result.state, network },
        result: { validCount: result.valid_count, spentCount: result.spent_count },
      };
    } catch (err) { wrapError(err); }
  }

  async walletMerge(handle: WalletHandle, maxOutputs: number): Promise<{ handle: WalletHandle; message: string }> {
    try {
      const { stateJson, network } = assertWasm(handle);
      const resultJson = await this.wasm.wallet_merge(stateJson, network, maxOutputs);
      const result = JSON.parse(resultJson);
      return {
        handle: { _tag: "wasm", stateJson: result.state, network },
        message: result.message,
      };
    } catch (err) { wrapError(err); }
  }

  async walletRecover(handle: WalletHandle, masterSecretHex: string, gapLimit: number): Promise<{ handle: WalletHandle; result: RecoveryResult }> {
    try {
      const { stateJson, network } = assertWasm(handle);
      const resultJson = await this.wasm.wallet_recover(stateJson, network, masterSecretHex, gapLimit);
      const result = JSON.parse(resultJson);
      return {
        handle: { _tag: "wasm", stateJson: result.state, network },
        result: { recoveredCount: result.recovered_count, totalAmount: BigInt(result.total_amount) },
      };
    } catch (err) { wrapError(err); }
  }

  async walletRecoverFromWallet(handle: WalletHandle, gapLimit: number): Promise<{ handle: WalletHandle; result: RecoveryResult }> {
    try {
      const { stateJson, network } = assertWasm(handle);
      const resultJson = await this.wasm.wallet_recover_from_wallet(stateJson, network, gapLimit);
      const result = JSON.parse(resultJson);
      return {
        handle: { _tag: "wasm", stateJson: result.state, network },
        result: { recoveredCount: result.recovered_count, totalAmount: BigInt(result.total_amount) },
      };
    } catch (err) { wrapError(err); }
  }

  // ── Inspection ─────────────────────────────────────────────

  async walletStats(handle: WalletHandle): Promise<WalletStats> {
    try {
      const { stateJson, network } = assertWasm(handle);
      const raw = JSON.parse(this.wasm.wallet_stats(stateJson, network));
      return {
        totalWebcash: raw.total_webcash,
        unspentWebcash: raw.unspent_webcash,
        spentWebcash: raw.spent_webcash,
        totalBalance: this.wasm.format_amount(BigInt(raw.total_balance)),
      };
    } catch (err) { wrapError(err); }
  }

  async walletExportSnapshot(handle: WalletHandle): Promise<string> {
    try {
      const { stateJson, network } = assertWasm(handle);
      return this.wasm.wallet_export_snapshot(stateJson, network);
    } catch (err) { wrapError(err); }
  }

  async walletImportSnapshot(handle: WalletHandle, json: string): Promise<WalletHandle> {
    try {
      const { network } = assertWasm(handle);
      const newState = this.wasm.wallet_import_snapshot(json, network);
      return { _tag: "wasm", stateJson: newState, network };
    } catch (err) { wrapError(err); }
  }

  async walletListWebcash(handle: WalletHandle): Promise<string[]> {
    try {
      const { stateJson, network } = assertWasm(handle);
      return JSON.parse(this.wasm.wallet_list_webcash(stateJson, network));
    } catch (err) { wrapError(err); }
  }

  async walletMasterSecret(handle: WalletHandle): Promise<string> {
    try {
      const { stateJson, network } = assertWasm(handle);
      return this.wasm.wallet_master_secret(stateJson, network);
    } catch (err) { wrapError(err); }
  }

  // ── Encryption ─────────────────────────────────────────────

  async walletEncryptSeed(_handle: WalletHandle, _password: string): Promise<void> {
    throw new WebycashError(WebycashErrorCode.NotSupported, "encryptSeed is only available with the FFI backend");
  }

  async walletEncryptWithPassword(handle: WalletHandle, password: string): Promise<string> {
    try {
      const { stateJson, network } = assertWasm(handle);
      return this.wasm.wallet_encrypt_with_password(stateJson, network, password);
    } catch (err) { wrapError(err); }
  }

  async walletDecryptWithPassword(handle: WalletHandle, encryptedJson: string, password: string): Promise<WalletHandle> {
    try {
      const { network } = assertWasm(handle);
      const newState = this.wasm.wallet_decrypt_with_password(encryptedJson, password, network);
      return { _tag: "wasm", stateJson: newState, network };
    } catch (err) { wrapError(err); }
  }

  // ── Utilities ──────────────────────────────────────────────

  version(): string {
    return this.wasm.sdk_version();
  }

  amountParse(s: string): bigint {
    return this.wasm.parse_amount(s);
  }

  amountFormat(wats: bigint): string {
    return this.wasm.format_amount(wats);
  }

  // ── Crypto ─────────────────────────────────────────────────

  deriveSecret(masterSecretHex: string, chainCode: number, depth: number): string {
    return this.wasm.derive_secret(masterSecretHex, chainCode, BigInt(depth));
  }

  generateMasterSecret(): string {
    return this.wasm.generate_master_secret();
  }

  sha256Hex(data: string): string {
    return this.wasm.sha256_hex(data);
  }

  secretToPublic(secret: string): string {
    return this.wasm.secret_to_public(secret);
  }

  // ── Webcash ────────────────────────────────────────────────

  parseWebcash(s: string): ParsedWebcash {
    const raw = this.wasm.parse_webcash(s);
    return {
      secret: raw.secret,
      amountWats: BigInt(raw.amount_wats),
      amountDisplay: raw.amount_display,
      publicHash: raw.public_hash,
    };
  }

  formatWebcash(secret: string, amountWats: bigint): string {
    return this.wasm.format_webcash(secret, amountWats);
  }

  formatPublicWebcash(hashHex: string, amountWats: bigint): string {
    return this.wasm.format_public_webcash(hashHex, amountWats);
  }
}
