import type {
  CheckResult,
  NetworkMode,
  RecoveryResult,
  WalletStats,
  VerifyResult,
  ParsedWebcash,
} from "./types.js";

/** Opaque wallet handle — pointer for FFI, state JSON for WASM. */
export type WalletHandle = { _tag: "ffi"; ptr: unknown } | { _tag: "wasm"; stateJson: string; network: string };

/** Backend interface — all wallet operations. */
export interface Backend {
  readonly name: "ffi" | "wasm";

  // ── Lifecycle ──────────────────────────────────────────────
  walletOpen(path: string, network: NetworkMode, seed?: Uint8Array): Promise<WalletHandle>;
  walletClose(handle: WalletHandle): void;

  // ── Operations (may hit server) ────────────────────────────
  walletBalance(handle: WalletHandle): Promise<string>;
  walletInsert(handle: WalletHandle, webcash: string): Promise<WalletHandle>;
  walletPay(handle: WalletHandle, amount: string, memo: string): Promise<{ handle: WalletHandle; paymentWebcash: string }>;
  walletCheck(handle: WalletHandle): Promise<{ handle: WalletHandle; result: CheckResult }>;
  walletMerge(handle: WalletHandle, maxOutputs: number): Promise<{ handle: WalletHandle; message: string }>;
  walletRecover(handle: WalletHandle, masterSecretHex: string, gapLimit: number): Promise<{ handle: WalletHandle; result: RecoveryResult }>;
  walletRecoverFromWallet(handle: WalletHandle, gapLimit: number): Promise<{ handle: WalletHandle; result: RecoveryResult }>;

  // ── Inspection ─────────────────────────────────────────────
  walletStats(handle: WalletHandle): Promise<WalletStats>;
  walletExportSnapshot(handle: WalletHandle): Promise<string>;
  walletImportSnapshot(handle: WalletHandle, json: string): Promise<WalletHandle>;
  walletListWebcash(handle: WalletHandle): Promise<string[]>;
  walletMasterSecret(handle: WalletHandle): Promise<string>;

  // ── Encryption ─────────────────────────────────────────────
  walletEncryptSeed(handle: WalletHandle, password: string): Promise<void>;
  walletEncryptWithPassword(handle: WalletHandle, password: string): Promise<string>;
  walletDecryptWithPassword(handle: WalletHandle, encryptedJson: string, password: string): Promise<WalletHandle>;

  // ── Utilities ──────────────────────────────────────────────
  version(): string;
  amountParse(s: string): bigint;
  amountFormat(wats: bigint): string;

  // ── Crypto ─────────────────────────────────────────────────
  deriveSecret(masterSecretHex: string, chainCode: number, depth: number): string;
  generateMasterSecret(): string;
  sha256Hex(data: string): string;
  secretToPublic(secret: string): string;

  // ── Webcash ────────────────────────────────────────────────
  parseWebcash(s: string): ParsedWebcash;
  formatWebcash(secret: string, amountWats: bigint): string;
  formatPublicWebcash(hashHex: string, amountWats: bigint): string;
}
