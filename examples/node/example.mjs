#!/usr/bin/env node
/**
 * webycash-sdk Node.js example -- complete webcash protocol reference.
 *
 * Usage (offline, no server needed):
 *     node example.mjs
 *
 * Usage (with funded webcash for server operations):
 *     TEST_WEBCASH='e1.00000000:secret:abc123...' node example.mjs
 *
 * Requires:
 *     npm install webycash-sdk
 *     (or run from repo with `npm run build` in node/)
 */

import path from "node:path";
import os from "node:os";
import fs from "node:fs";

// When running from the repo, resolve the local build.
// When installed via npm, use: import { ... } from "webycash-sdk";
import {
  Wallet,
  WebycashError,
  version,
  amountParse,
  amountFormat,
} from "../../node/dist/index.js";

/** Remove a file silently. */
function rm(filePath) {
  try { fs.unlinkSync(filePath); } catch { /* ignore */ }
}

/** Remove wallet files (db + WAL + SHM). */
function rmWallet(dbPath) {
  for (const suffix of ["", "-wal", "-shm"]) rm(dbPath + suffix);
}

async function main() {
  console.log("=== webycash-sdk Node.js Example ===\n");

  // -- 1. Version & utilities ----------------------------------------
  console.log("-- 1. Version & utilities --");

  const v = await version("ffi");
  console.log(`  SDK version: ${v}`);

  // Parse a decimal webcash amount to its integer representation (wats).
  // 1 webcash = 100,000,000 wats (8 decimal places, like satoshis).
  // amountParse returns a BigInt.
  const wats = await amountParse("1.5", "ffi");
  console.log(`  amountParse('1.5') = ${wats} wats`);
  if (wats !== 150_000_000n) throw new Error(`expected 150000000n, got ${wats}`);

  // Format wats back to a human-readable decimal string.
  const formatted = await amountFormat(wats, "ffi");
  console.log(`  amountFormat(${wats}) = '${formatted}'`);
  if (formatted !== "1.5") throw new Error(`expected '1.5', got '${formatted}'`);

  // Smallest representable amount: 1 wat = 0.00000001 webcash.
  const oneWat = await amountParse("0.00000001", "ffi");
  console.log(`  amountParse('0.00000001') = ${oneWat} wat`);
  if (oneWat !== 1n) throw new Error(`expected 1n, got ${oneWat}`);

  console.log("  OK\n");

  // -- 2. Create wallet ----------------------------------------------
  console.log("-- 2. Create wallet --");

  // Wallets are SQLite databases. Use Wallet.open() (async factory)
  // and close() in a try/finally block.
  const dbPath = path.join(os.tmpdir(), "webycash_example.db");
  rmWallet(dbPath);

  // Snapshot is captured inside the first wallet session and used in step 7.
  let snapshot;
  let savedSecret;

  const w = await Wallet.open(dbPath, { backend: "ffi" });
  try {
    console.log(`  Wallet created: ${dbPath}`);
    console.log("  Wallet is open and ready.\n");

    // -- 3. Master secret backup -------------------------------------
    console.log("-- 3. Master secret backup --");

    // The master secret is a 64-hex-char (32-byte) key that can regenerate
    // all wallet addresses via HD derivation. This is the recovery seed.
    // BACK THIS UP SECURELY -- losing it means losing funds.
    savedSecret = await w.masterSecret();
    console.log(`  Master secret: ${savedSecret}`);
    console.log(`  Length: ${savedSecret.length} hex chars (32 bytes)`);
    if (savedSecret.length !== 64) throw new Error("master secret must be 64 hex chars");
    if (!/^[0-9a-f]{64}$/.test(savedSecret)) throw new Error("master secret must be lowercase hex");
    console.log("  Store this offline. It can recover all wallet outputs.\n");

    // -- 4. Balance & stats ------------------------------------------
    console.log("-- 4. Balance & stats --");

    const balance = await w.balance();
    console.log(`  Balance: ${balance} webcash`);
    if (balance !== "0" && balance !== "0.00000000") {
      throw new Error(`expected zero balance, got '${balance}'`);
    }

    // stats() returns a WalletStats object with wallet metrics.
    const stats = await w.stats();
    console.log(`  Stats: ${JSON.stringify(stats, null, 4)}`);
    if (stats.unspentWebcash !== 0) throw new Error("expected 0 unspent");
    console.log();

    // -- 5. List outputs ---------------------------------------------
    console.log("-- 5. List outputs --");

    // listWebcash() returns an array of all unspent webcash strings.
    // Each string is a secret that controls funds on the server.
    const outputs = await w.listWebcash();
    console.log(`  Unspent outputs: ${outputs.length}`);
    if (outputs.length !== 0) throw new Error("new wallet should have no outputs");
    console.log("  Empty wallet -- no outputs yet.\n");

    // -- 6. Snapshot backup ------------------------------------------
    console.log("-- 6. Snapshot backup --");

    // exportSnapshot() returns the full wallet state as JSON.
    // This includes the master secret, all outputs, and metadata.
    // Unlike the master secret alone, a snapshot restores instantly
    // without needing to scan the server for derived outputs.
    snapshot = await w.exportSnapshot();
    const snapParsed = JSON.parse(snapshot);
    console.log(`  Snapshot is valid JSON: ${snapshot.length} chars`);
    console.log(`  Snapshot keys: ${JSON.stringify(Object.keys(snapParsed))}`);
    console.log("  This is a full backup -- save it encrypted.\n");

  } finally {
    w.close();
  }

  // -- 7. Snapshot restore -------------------------------------------
  console.log("-- 7. Snapshot restore --");

  // Open a second wallet and restore from the snapshot.
  const dbRestore = path.join(os.tmpdir(), "webycash_example_restore.db");
  rmWallet(dbRestore);

  const w2 = await Wallet.open(dbRestore, { backend: "ffi" });
  try {
    await w2.importSnapshot(snapshot);
    const balance2 = await w2.balance();
    console.log(`  Restored wallet balance: ${balance2}`);

    // The restored wallet has the same master secret.
    const secret2 = await w2.masterSecret();
    if (secret2 !== savedSecret) throw new Error("master secret must match after restore");
    console.log(`  Master secret matches original: ${secret2.slice(0, 16)}...`);
    console.log("  Snapshot restore complete.\n");
  } finally {
    w2.close();
  }

  // Reopen the original wallet for remaining steps.
  const w3 = await Wallet.open(dbPath, { backend: "ffi" });
  try {

    // -- 8. Password encryption --------------------------------------
    console.log("-- 8. Password encryption --");

    // encryptWithPassword() exports the wallet encrypted with a password.
    // The result is a JSON blob that can be stored or transmitted safely.
    const password = "strongPassword123";
    const encrypted = await w3.encryptWithPassword(password);
    const encParsed = JSON.parse(encrypted);
    console.log(`  Encrypted blob: ${encrypted.length} chars`);
    console.log(`  Encrypted keys: ${JSON.stringify(Object.keys(encParsed))}`);
    console.log("  This blob is safe to store -- it requires the password to decrypt.");

    // decryptWithPassword() restores wallet state from the encrypted blob.
    await w3.decryptWithPassword(encrypted, password);
    const balanceAfter = await w3.balance();
    console.log(`  Balance after decrypt: ${balanceAfter}`);
    console.log("  Wallet works normally after decryption.\n");

    // -- 9. Server operations (conditional) --------------------------
    console.log("-- 9. Server operations --");

    let testWebcash = process.env.TEST_WEBCASH;
    if (!testWebcash) {
      console.log("  Skipped (set TEST_WEBCASH env var to run).");
      console.log("  Example: TEST_WEBCASH='e1.00000000:secret:abc...' node example.mjs\n");
    } else {
      // 9a. Insert webcash (receive payment).
      // When someone sends you webcash, you call insert() with the secret
      // string they gave you. The SDK verifies it with the server and
      // re-derives it to a new secret only your wallet knows.
      console.log(`  Inserting: ${testWebcash.slice(0, 40)}...`);
      try {
        await w3.insert(testWebcash);
        const bal = await w3.balance();
        console.log(`  Balance after insert: ${bal} webcash`);
      } catch (e) {
        if (e instanceof WebycashError) {
          console.log(`  Insert failed: ${e.message}`);
          console.log("  (The webcash may be already spent or invalid.)");
          testWebcash = null;
        } else {
          throw e;
        }
      }
    }

    if (testWebcash) {
      // 9b. Balance increased.
      const stats2 = await w3.stats();
      console.log(`  Unspent outputs: ${stats2.unspentWebcash}`);

      // 9c. Pay amount (create payment for someone else).
      // pay() splits your webcash and returns a secret string.
      // The recipient calls insert() with that string to claim the funds.
      console.log("  Paying 0.00000001 webcash...");
      try {
        const payment = await w3.pay("0.00000001", "example-payment");
        // 9d. Show the payment webcash string.
        console.log(`  Payment webcash: ${payment}`);
        console.log("  Send this string to the recipient.");
        const bal = await w3.balance();
        console.log(`  Balance after pay: ${bal}`);
      } catch (e) {
        if (e instanceof WebycashError) {
          console.log(`  Pay failed: ${e.message}`);
        } else {
          throw e;
        }
      }

      // 9e. Check wallet against server.
      // check() verifies all unspent outputs are still valid on the server.
      console.log("  Checking wallet against server...");
      try {
        const checkResult = await w3.check();
        console.log(`  Check: ${checkResult.validCount} valid, ${checkResult.spentCount} spent.`);
      } catch (e) {
        if (e instanceof WebycashError) {
          console.log(`  Check: ${e.message}`);
        } else {
          throw e;
        }
      }

      // 9f. Merge outputs (reduce fragmentation).
      // Over time, wallet accumulates many small outputs from change.
      // merge() consolidates them into fewer, larger outputs.
      console.log("  Merging outputs (max 20)...");
      try {
        const mergeResult = await w3.merge(20);
        console.log(`  Merge result: ${mergeResult}`);
      } catch (e) {
        if (e instanceof WebycashError) {
          console.log(`  Merge: ${e.message}`);
        } else {
          throw e;
        }
      }

      // 9g. List all unspent outputs.
      const allOutputs = await w3.listWebcash();
      console.log(`  Unspent outputs after merge: ${allOutputs.length}`);
      for (let i = 0; i < Math.min(allOutputs.length, 3); i++) {
        console.log(`    [${i}] ${allOutputs[i].slice(0, 50)}...`);
      }
      if (allOutputs.length > 3) {
        console.log(`    ... and ${allOutputs.length - 3} more`);
      }

      // 9h. Get updated stats.
      const finalStats = await w3.stats();
      console.log(`  Final stats: ${JSON.stringify(finalStats, null, 4)}`);
      console.log();
    }

    // -- 10. Recovery from master secret -----------------------------
    console.log("-- 10. Recovery from master secret --");

    // recoverFromWallet() scans the server for outputs derived from
    // this wallet's master secret. gapLimit controls how many empty
    // derivation slots to check before stopping.
    // This requires network access -- it will fail offline.
    console.log("  Attempting recoverFromWallet(gapLimit=5)...");
    try {
      const result = await w3.recoverFromWallet(5);
      console.log(`  Recovery result: recovered=${result.recoveredCount}, amount=${result.totalAmount}`);
    } catch (e) {
      if (e instanceof WebycashError) {
        console.log(`  Recovery failed (expected offline): ${e.message}`);
      } else {
        throw e;
      }
    }
    console.log();

  } finally {
    // -- 11. Cleanup -------------------------------------------------
    console.log("-- 11. Cleanup --");

    // Always close wallets when done to flush the SQLite WAL and release locks.
    // In production, keep wallet files -- they are your funds.
    w3.close();
    rmWallet(dbPath);
    rmWallet(dbRestore);

    console.log("  Wallets closed, temporary files removed.");
    console.log("  In production, wallet files ARE your funds -- protect them.\n");
  }

  console.log("=== Example complete ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
