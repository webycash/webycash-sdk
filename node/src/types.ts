/** Network mode for the webcash server. */
export type NetworkMode = "production" | "testnet";

/** Backend selection for wallet operations. */
export type BackendType = "ffi" | "wasm" | "auto";

/** Options for opening a wallet. */
export interface WalletOptions {
  seed?: Uint8Array;
  network?: NetworkMode;
  backend?: BackendType;
}

/** Wallet statistics. */
export interface WalletStats {
  totalWebcash: number;
  unspentWebcash: number;
  spentWebcash: number;
  totalBalance: string;
}

/** Parsed webcash components. */
export interface ParsedWebcash {
  secret: string;
  amountWats: bigint;
  amountDisplay: string;
  publicHash: string;
}

/** Result from verifying webcash against the server. */
export interface VerifyResult {
  spent: boolean | null;
  amount: string | null;
}

/** Recovery operation result. */
export interface RecoveryResult {
  recoveredCount: number;
  totalAmount: bigint;
}

/** Check operation result. */
export interface CheckResult {
  validCount: number;
  spentCount: number;
}

/** Error codes matching the native library. */
export enum WebycashErrorCode {
  Ok = 0,
  InvalidInput = 1,
  DatabaseError = 2,
  CryptoError = 3,
  ServerError = 4,
  InsufficientFunds = 5,
  NetworkError = 6,
  AuthError = 7,
  NotSupported = 8,
  Unknown = -1,
}
