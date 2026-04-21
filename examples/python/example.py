#!/usr/bin/env python3
"""
webycash-sdk Python example -- complete webcash protocol reference.

Usage (offline, no server needed):
    python example.py

Usage (with funded webcash for server operations):
    TEST_WEBCASH='e1.00000000:secret:abc123...' python example.py

Requires:
    pip install webycash-sdk
    (or run from repo with the native library built)
"""

import os
import json
import tempfile
from webycash_sdk import Wallet, version, amount_parse, amount_format, WebycashError


def main():
    print("=== webycash-sdk Python Example ===\n")

    # ── 1. Version & utilities ──────────────────────────────────
    print("-- 1. Version & utilities --")

    v = version()
    print(f"  SDK version: {v}")

    # Parse a decimal webcash amount to its integer representation (wats).
    # 1 webcash = 100,000,000 wats (8 decimal places, like satoshis).
    wats = amount_parse("1.5")
    print(f"  amount_parse('1.5') = {wats} wats")
    assert wats == 150_000_000, f"expected 150000000, got {wats}"

    # Format wats back to a human-readable decimal string.
    formatted = amount_format(wats)
    print(f"  amount_format({wats}) = '{formatted}'")
    assert formatted == "1.5", f"expected '1.5', got '{formatted}'"

    # Smallest representable amount: 1 wat = 0.00000001 webcash.
    one_wat = amount_parse("0.00000001")
    print(f"  amount_parse('0.00000001') = {one_wat} wat")
    assert one_wat == 1

    print("  OK\n")

    # ── 2. Create wallet ────────────────────────────────────────
    print("-- 2. Create wallet --")

    # Wallets are SQLite databases. The context manager ensures proper cleanup.
    db_path = os.path.join(tempfile.gettempdir(), "webycash_example.db")
    # Clean up any leftover from previous runs.
    for suffix in ("", "-wal", "-shm"):
        try:
            os.remove(db_path + suffix)
        except FileNotFoundError:
            pass

    with Wallet(db_path) as w:
        print(f"  Wallet created: {db_path}")
        print(f"  Wallet is open and ready.\n")

        # ── 3. Master secret backup ────────────────────────────
        print("-- 3. Master secret backup --")

        # The master secret is a 64-hex-char (32-byte) key that can regenerate
        # all wallet addresses via HD derivation. This is the recovery seed.
        # BACK THIS UP SECURELY -- losing it means losing funds.
        secret = w.master_secret
        print(f"  Master secret: {secret}")
        print(f"  Length: {len(secret)} hex chars (32 bytes)")
        assert len(secret) == 64
        assert all(c in "0123456789abcdef" for c in secret)
        print("  Store this offline. It can recover all wallet outputs.\n")

        # ── 4. Balance & stats ──────────────────────────────────
        print("-- 4. Balance & stats --")

        balance = w.balance()
        print(f"  Balance: {balance} webcash")
        assert balance == "0", f"expected '0', got '{balance}'"

        # Stats returns a JSON object with wallet metrics.
        stats_json = w.stats()
        stats = json.loads(stats_json)
        print(f"  Stats: {json.dumps(stats, indent=4)}")
        assert stats["unspent_webcash"] == 0
        print()

        # ── 5. List outputs ─────────────────────────────────────
        print("-- 5. List outputs --")

        # list_webcash() returns a JSON array of all unspent webcash strings.
        # Each string is a secret that controls funds on the server.
        outputs_json = w.list_webcash()
        outputs = json.loads(outputs_json)
        print(f"  Unspent outputs: {len(outputs)}")
        assert len(outputs) == 0, "new wallet should have no outputs"
        print("  Empty wallet -- no outputs yet.\n")

        # ── 6. Snapshot backup ──────────────────────────────────
        print("-- 6. Snapshot backup --")

        # export_snapshot() returns the full wallet state as JSON.
        # This includes the master secret, all outputs, and metadata.
        # Unlike the master secret alone, a snapshot restores instantly
        # without needing to scan the server for derived outputs.
        snapshot = w.export_snapshot()
        snap_parsed = json.loads(snapshot)
        print(f"  Snapshot is valid JSON: {len(snapshot)} chars")
        print(f"  Snapshot keys: {list(snap_parsed.keys())}")
        print("  This is a full backup -- save it encrypted.\n")

    # ── 7. Snapshot restore ─────────────────────────────────────
    print("-- 7. Snapshot restore --")

    # Open a second wallet and restore from the snapshot.
    db_restore = os.path.join(tempfile.gettempdir(), "webycash_example_restore.db")
    for suffix in ("", "-wal", "-shm"):
        try:
            os.remove(db_restore + suffix)
        except FileNotFoundError:
            pass

    with Wallet(db_restore) as w2:
        w2.import_snapshot(snapshot)
        balance2 = w2.balance()
        print(f"  Restored wallet balance: {balance2}")

        # The restored wallet has the same master secret.
        secret2 = w2.master_secret
        assert secret2 == secret, "master secret must match after restore"
        print(f"  Master secret matches original: {secret2[:16]}...")
        print("  Snapshot restore complete.\n")

    # Reopen the original wallet for remaining steps.
    with Wallet(db_path) as w:

        # ── 8. Password encryption ──────────────────────────────
        print("-- 8. Password encryption --")

        # encrypt_with_password() exports the wallet encrypted with a password.
        # The result is a JSON blob that can be stored or transmitted safely.
        password = "strongPassword123"
        encrypted = w.encrypt_with_password(password)
        enc_parsed = json.loads(encrypted)
        print(f"  Encrypted blob: {len(encrypted)} chars")
        print(f"  Encrypted keys: {list(enc_parsed.keys())}")
        print("  This blob is safe to store -- it requires the password to decrypt.")

        # decrypt_with_password() restores wallet state from the encrypted blob.
        w.decrypt_with_password(encrypted, password)
        balance_after = w.balance()
        print(f"  Balance after decrypt: {balance_after}")
        assert balance_after == "0", "balance must be preserved through encrypt/decrypt"
        print("  Wallet works normally after decryption.\n")

        # ── 9. Server operations (conditional) ──────────────────
        print("-- 9. Server operations --")

        test_webcash = os.environ.get("TEST_WEBCASH")
        if not test_webcash:
            print("  Skipped (set TEST_WEBCASH env var to run).")
            print("  Example: TEST_WEBCASH='e1.00000000:secret:abc...' python example.py\n")
        else:
            # 9a. Insert webcash (receive payment).
            # When someone sends you webcash, you call insert() with the secret
            # string they gave you. The SDK verifies it with the server and
            # re-derives it to a new secret only your wallet knows.
            print(f"  Inserting: {test_webcash[:40]}...")
            try:
                w.insert(test_webcash)
                balance = w.balance()
                print(f"  Balance after insert: {balance} webcash")
                assert float(balance) > 0, "balance should be positive after insert"
            except WebycashError as e:
                print(f"  Insert failed: {e}")
                print("  (The webcash may be already spent or invalid.)\n")
                # Skip remaining server operations if insert failed.
                test_webcash = None

        if test_webcash:
            # 9b. Balance increased.
            stats = json.loads(w.stats())
            print(f"  Unspent outputs: {stats['unspent_webcash']}")

            # 9c. Pay amount (create payment for someone else).
            # pay() splits your webcash and returns a secret string.
            # The recipient calls insert() with that string to claim the funds.
            print("  Paying 0.00000001 webcash...")
            try:
                payment = w.pay("0.00000001", "example-payment")
                # 9d. Show the payment webcash string.
                print(f"  Payment webcash: {payment}")
                print("  Send this string to the recipient.")
                balance = w.balance()
                print(f"  Balance after pay: {balance}")
            except WebycashError as e:
                print(f"  Pay failed: {e}")

            # 9e. Check wallet against server.
            # check() verifies all unspent outputs are still valid on the server.
            print("  Checking wallet against server...")
            try:
                w.check()
                print("  Check: all outputs valid.")
            except WebycashError as e:
                print(f"  Check: {e}")

            # 9f. Merge outputs (reduce fragmentation).
            # Over time, wallet accumulates many small outputs from change.
            # merge() consolidates them into fewer, larger outputs.
            print("  Merging outputs (max 20)...")
            try:
                result = w.merge(20)
                print(f"  Merge result: {result}")
            except WebycashError as e:
                print(f"  Merge: {e}")

            # 9g. List all unspent outputs.
            outputs = json.loads(w.list_webcash())
            print(f"  Unspent outputs after merge: {len(outputs)}")
            for i, out in enumerate(outputs[:3]):
                print(f"    [{i}] {out[:50]}...")
            if len(outputs) > 3:
                print(f"    ... and {len(outputs) - 3} more")

            # 9h. Get updated stats.
            stats = json.loads(w.stats())
            print(f"  Final stats: {json.dumps(stats, indent=4)}")
            print()

        # ── 10. Recovery from master secret ─────────────────────
        print("-- 10. Recovery from master secret --")

        # recover_from_wallet() scans the server for outputs derived from
        # this wallet's master secret. gap_limit controls how many empty
        # derivation slots to check before stopping.
        # This requires network access -- it will fail offline.
        print("  Attempting recover_from_wallet(gap_limit=5)...")
        try:
            result = w.recover_from_wallet(gap_limit=5)
            print(f"  Recovery result: {result}")
        except WebycashError as e:
            print(f"  Recovery failed (expected offline): {e}")
        print()

    # ── 11. Cleanup ─────────────────────────────────────────────
    print("-- 11. Cleanup --")

    # Wallets are closed automatically by the context manager (with statement).
    # Always close wallets when done to flush the SQLite WAL and release locks.
    # In production, keep wallet files -- they are your funds.
    for path in (db_path, db_restore):
        for suffix in ("", "-wal", "-shm"):
            try:
                os.remove(path + suffix)
            except FileNotFoundError:
                pass

    print("  Temporary wallet files removed.")
    print("  In production, wallet files ARE your funds -- protect them.\n")

    print("=== Example complete ===")


if __name__ == "__main__":
    main()
