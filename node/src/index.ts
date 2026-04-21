// ── Public API ──────────────────────────────────────────────────

export { Wallet } from "./wallet.js";
export { WebycashError } from "./error.js";
export { resolveBackend, getBackend } from "./init.js";

export type {
  NetworkMode,
  BackendType,
  WalletOptions,
  WalletStats,
  ParsedWebcash,
  VerifyResult,
  RecoveryResult,
  CheckResult,
  WebycashErrorCode,
} from "./types.js";

export type { Backend, WalletHandle } from "./backend.js";

// ── Standalone utilities ────────────────────────────────────────
// These require a backend but don't need an open wallet.

import { getBackend } from "./init.js";
import type { BackendType, ParsedWebcash } from "./types.js";

/** Get the library version string. */
export async function version(backend?: BackendType): Promise<string> {
  return (await getBackend(backend)).version();
}

/** Parse an amount string to wats (integer). */
export async function amountParse(s: string, backend?: BackendType): Promise<bigint> {
  return (await getBackend(backend)).amountParse(s);
}

/** Format wats as a decimal amount string. */
export async function amountFormat(wats: bigint, backend?: BackendType): Promise<string> {
  return (await getBackend(backend)).amountFormat(wats);
}

/** Derive a secret from master secret using HD wallet derivation. */
export async function deriveSecret(masterSecretHex: string, chainCode: number, depth: number, backend?: BackendType): Promise<string> {
  return (await getBackend(backend)).deriveSecret(masterSecretHex, chainCode, depth);
}

/** Generate a random 32-byte master secret as hex. */
export async function generateMasterSecret(backend?: BackendType): Promise<string> {
  return (await getBackend(backend)).generateMasterSecret();
}

/** SHA-256 hash of a string, returned as hex. */
export async function sha256Hex(data: string, backend?: BackendType): Promise<string> {
  return (await getBackend(backend)).sha256Hex(data);
}

/** Hash a secret string to its public webcash hash. */
export async function secretToPublic(secret: string, backend?: BackendType): Promise<string> {
  return (await getBackend(backend)).secretToPublic(secret);
}

/** Parse a webcash string into its components. */
export async function parseWebcash(s: string, backend?: BackendType): Promise<ParsedWebcash> {
  return (await getBackend(backend)).parseWebcash(s);
}

/** Format a webcash string from secret and amount in wats. */
export async function formatWebcash(secret: string, amountWats: bigint, backend?: BackendType): Promise<string> {
  return (await getBackend(backend)).formatWebcash(secret, amountWats);
}

/** Format a public webcash string from hash and amount in wats. */
export async function formatPublicWebcash(hashHex: string, amountWats: bigint, backend?: BackendType): Promise<string> {
  return (await getBackend(backend)).formatPublicWebcash(hashHex, amountWats);
}
