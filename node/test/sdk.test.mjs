/**
 * Offline FFI smoke tests — no network.
 *
 * Uses Node.js built-in test runner (node:test) and assertions (node:assert).
 * All wallet operations use { backend: "ffi" }.
 */

import { describe, test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { mkdtempSync, rmSync } from "node:fs";
import path from "node:path";

import {
  Wallet,
  WebycashError,
  version,
  amountParse,
  amountFormat,
} from "../dist/index.js";

const BACKEND = "ffi";

/** Create a fresh temp directory; caller must clean up. */
function makeTmpDir() {
  return mkdtempSync(path.join(tmpdir(), "webycash-test-"));
}

/** Remove a temp directory tree silently. */
function cleanUp(dir) {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch (_) {
    /* best effort */
  }
}

// ── Tests ──────────────────────────────────────────────────────

describe("webycash-sdk (FFI)", () => {
  /** Track temp dirs so afterEach can clean them up if a test forgets. */
  const dirs = [];
  afterEach(() => {
    for (const d of dirs) cleanUp(d);
    dirs.length = 0;
  });

  function tmpWalletPath() {
    const dir = makeTmpDir();
    dirs.push(dir);
    return path.join(dir, "wallet.db");
  }

  // 1 ─────────────────────────────────────────────────────────────
  test("test_version", async () => {
    const v = await version(BACKEND);
    assert.equal(typeof v, "string");
    assert.ok(v.length > 0, "version must be non-empty");
  });

  // 2 ─────────────────────────────────────────────────────────────
  test("test_amount_roundtrip", async () => {
    // 1.5 webcash = 150_000_000 wats
    const wats1 = await amountParse("1.5", BACKEND);
    assert.equal(wats1, 150000000n);
    const str1 = await amountFormat(wats1, BACKEND);
    assert.equal(str1, "1.5");

    // smallest unit
    const wats2 = await amountParse("0.00000001", BACKEND);
    assert.equal(wats2, 1n);
    const str2 = await amountFormat(wats2, BACKEND);
    assert.equal(str2, "0.00000001");
  });

  // 3 ─────────────────────────────────────────────────────────────
  test("test_wallet_open_balance_close", async () => {
    const dbPath = tmpWalletPath();
    const w = await Wallet.open(dbPath, { backend: BACKEND });
    try {
      const b = await w.balance();
      assert.ok(b === "0" || b === "0.00000000", `balance should be zero, got: ${b}`);
    } finally {
      w.close();
    }
  });

  // 4 ─────────────────────────────────────────────────────────────
  test("test_export_import_snapshot", async () => {
    const dbA = tmpWalletPath();
    const dbB = tmpWalletPath();

    const walletA = await Wallet.open(dbA, { backend: BACKEND });
    let snapshotA;
    try {
      snapshotA = await walletA.exportSnapshot();
      assert.equal(typeof snapshotA, "string");
      assert.ok(snapshotA.length > 0, "snapshot must be non-empty");
      // Verify it is valid JSON
      JSON.parse(snapshotA);
    } finally {
      walletA.close();
    }

    const walletB = await Wallet.open(dbB, { backend: BACKEND });
    try {
      await walletB.importSnapshot(snapshotA);
      const snapshotB = await walletB.exportSnapshot();
      // Compare parsed JSON (key order may differ)
      assert.deepEqual(JSON.parse(snapshotB), JSON.parse(snapshotA));
    } finally {
      walletB.close();
    }
  });

  // 5 ─────────────────────────────────────────────────────────────
  test("test_list_webcash_empty", async () => {
    const dbPath = tmpWalletPath();
    const w = await Wallet.open(dbPath, { backend: BACKEND });
    try {
      const list = await w.listWebcash();
      assert.ok(Array.isArray(list), "listWebcash must return an array");
      assert.equal(list.length, 0);
    } finally {
      w.close();
    }
  });

  // 6 ─────────────────────────────────────────────────────────────
  test("test_master_secret_format", async () => {
    const dbPath = tmpWalletPath();
    const w = await Wallet.open(dbPath, { backend: BACKEND });
    try {
      const secret = await w.masterSecret();
      assert.equal(typeof secret, "string");
      assert.equal(secret.length, 64, "master secret must be 64 hex chars");
      assert.match(secret, /^[0-9a-f]{64}$/, "master secret must be lowercase hex");
    } finally {
      w.close();
    }
  });

  // 7 ─────────────────────────────────────────────────────────────
  test("test_master_secret_deterministic", async () => {
    // A known 32-byte seed (all zeros for reproducibility)
    const seed = new Uint8Array(32);
    seed.fill(0);

    const dbPath1 = tmpWalletPath();
    const dbPath2 = tmpWalletPath();

    const w1 = await Wallet.open(dbPath1, { backend: BACKEND, seed });
    const w2 = await Wallet.open(dbPath2, { backend: BACKEND, seed });
    try {
      const s1 = await w1.masterSecret();
      const s2 = await w2.masterSecret();
      assert.match(s1, /^[0-9a-f]{64}$/);
      assert.equal(s1, s2, "same seed must produce same master secret");
    } finally {
      w1.close();
      w2.close();
    }
  });

  // 8 ─────────────────────────────────────────────────────────────
  test("test_encrypt_decrypt_password", async () => {
    const dbPath = tmpWalletPath();
    const w = await Wallet.open(dbPath, { backend: BACKEND });
    try {
      const encrypted = await w.encryptWithPassword("test123");
      assert.equal(typeof encrypted, "string");
      assert.ok(encrypted.length > 0, "encrypted blob must be non-empty");
      // Must be valid JSON
      JSON.parse(encrypted);

      await w.decryptWithPassword(encrypted, "test123");

      // Wallet still functional after decrypt round-trip
      const b = await w.balance();
      assert.equal(typeof b, "string");
      assert.ok(b.length > 0, "balance must be readable after decrypt");
    } finally {
      w.close();
    }
  });

  // 9 ─────────────────────────────────────────────────────────────
  test("test_recover_from_wallet_empty", async () => {
    const dbPath = tmpWalletPath();
    const w = await Wallet.open(dbPath, { backend: BACKEND });
    try {
      // Recovery on empty wallet may succeed (nothing to find) or fail with network error.
      // Either outcome is valid — the key test is that it doesn't crash.
      try {
        const result = await w.recoverFromWallet(5);
        // If it succeeds, that's fine
        assert.ok(result !== undefined);
      } catch (err) {
        // Network/server errors are expected in offline tests
        assert.ok(err instanceof WebycashError, "must throw WebycashError");
      }
    } finally {
      w.close();
    }
  });

  // 10 ────────────────────────────────────────────────────────────
  test("test_import_invalid_json", async () => {
    const dbPath = tmpWalletPath();
    const w = await Wallet.open(dbPath, { backend: BACKEND });
    try {
      await assert.rejects(
        () => w.importSnapshot("not json"),
        (err) => {
          assert.ok(err instanceof WebycashError, "must throw WebycashError");
          return true;
        },
      );
    } finally {
      w.close();
    }
  });
});
