import type { Backend, WalletHandle } from "./backend.js";
import type {
  BackendType,
  CheckResult,
  NetworkMode,
  RecoveryResult,
  WalletOptions,
  WalletStats,
} from "./types.js";
import { resolveBackend } from "./init.js";

/**
 * A webcash wallet.
 *
 * Use the async factory `Wallet.open()` to create an instance.
 * Call `close()` when done to release resources.
 */
export class Wallet {
  private handle: WalletHandle;
  private backend: Backend;

  private constructor(handle: WalletHandle, backend: Backend) {
    this.handle = handle;
    this.backend = backend;
  }

  /**
   * Open or create a wallet.
   *
   * For FFI backend: `path` is the database file path.
   * For WASM backend: `path` is ignored (wallet is in-memory).
   */
  static async open(path: string, options?: WalletOptions): Promise<Wallet> {
    const backend = await resolveBackend(options?.backend);
    const network = options?.network ?? "production";
    const handle = await backend.walletOpen(path, network, options?.seed);
    return new Wallet(handle, backend);
  }

  /** Release wallet resources. */
  close(): void {
    this.backend.walletClose(this.handle);
  }

  /** Which backend is active. */
  get backendName(): BackendType {
    return this.backend.name;
  }

  // ── Operations (may hit server) ────────────────────────────

  /** Get the wallet balance as a decimal string (e.g., "1.50000000"). */
  async balance(): Promise<string> {
    return this.backend.walletBalance(this.handle);
  }

  /** Insert webcash into the wallet (verifies with server). */
  async insert(webcash: string): Promise<void> {
    this.handle = await this.backend.walletInsert(this.handle, webcash);
  }

  /** Pay an amount. Returns the payment webcash string for the recipient. */
  async pay(amount: string, memo = ""): Promise<string> {
    const { handle, paymentWebcash } = await this.backend.walletPay(this.handle, amount, memo);
    this.handle = handle;
    return paymentWebcash;
  }

  /** Check wallet outputs against the server. */
  async check(): Promise<CheckResult> {
    const { handle, result } = await this.backend.walletCheck(this.handle);
    this.handle = handle;
    return result;
  }

  /** Merge small outputs to reduce fragmentation. */
  async merge(maxOutputs = 20): Promise<string> {
    const { handle, message } = await this.backend.walletMerge(this.handle, maxOutputs);
    this.handle = handle;
    return message;
  }

  /** Recover wallet from an external master secret. */
  async recover(masterSecretHex: string, gapLimit = 20): Promise<RecoveryResult> {
    const { handle, result } = await this.backend.walletRecover(this.handle, masterSecretHex, gapLimit);
    this.handle = handle;
    return result;
  }

  /** Recover wallet using its own stored master secret. */
  async recoverFromWallet(gapLimit = 20): Promise<RecoveryResult> {
    const { handle, result } = await this.backend.walletRecoverFromWallet(this.handle, gapLimit);
    this.handle = handle;
    return result;
  }

  // ── Inspection ─────────────────────────────────────────────

  /** Get wallet statistics. */
  async stats(): Promise<WalletStats> {
    return this.backend.walletStats(this.handle);
  }

  /** Export wallet as a JSON snapshot (for backup). */
  async exportSnapshot(): Promise<string> {
    return this.backend.walletExportSnapshot(this.handle);
  }

  /** Import wallet state from a JSON snapshot. */
  async importSnapshot(json: string): Promise<void> {
    this.handle = await this.backend.walletImportSnapshot(this.handle, json);
  }

  /** List all unspent webcash strings. */
  async listWebcash(): Promise<string[]> {
    return this.backend.walletListWebcash(this.handle);
  }

  /** Get the master secret as a 64-character hex string. */
  async masterSecret(): Promise<string> {
    return this.backend.walletMasterSecret(this.handle);
  }

  // ── Encryption ─────────────────────────────────────────────

  /** Encrypt the wallet seed (database-level, FFI only). */
  async encryptSeed(password: string): Promise<void> {
    return this.backend.walletEncryptSeed(this.handle, password);
  }

  /** Encrypt the full wallet with a password. Returns encrypted JSON blob. */
  async encryptWithPassword(password: string): Promise<string> {
    return this.backend.walletEncryptWithPassword(this.handle, password);
  }

  /** Decrypt wallet from encrypted JSON. */
  async decryptWithPassword(encryptedJson: string, password: string): Promise<void> {
    this.handle = await this.backend.walletDecryptWithPassword(this.handle, encryptedJson, password);
  }
}
