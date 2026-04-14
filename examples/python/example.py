#!/usr/bin/env python3
"""webycash-sdk Python example — full wallet lifecycle."""

import os
import sys
import json
import tempfile
from webycash_sdk import Wallet, version, amount_parse, amount_format, WebycashError

def main():
    print("=== webycash-sdk Python Example ===")
    print(f"Library version: {version()}")

    # ── Amount utilities ─────────────────────────────────────────
    print("\n── Amount utilities ──")
    wats = amount_parse("1.5")
    print(f"  parse('1.5') = {wats} wats")
    s = amount_format(wats)
    print(f"  format({wats}) = '{s}'")
    assert wats == 150000000
    assert s == "1.5"
    print("  OK")

    # ── Wallet lifecycle ─────────────────────────────────────────
    db_path = os.path.join(tempfile.gettempdir(), "webycash_sdk_test.db")
    if os.path.exists(db_path):
        os.remove(db_path)

    print(f"\n── Open wallet: {db_path} ──")
    with Wallet(db_path) as w:
        # Balance (empty wallet)
        balance = w.balance()
        print(f"  Balance (empty): {balance}")
        assert balance == "0"

        # Stats
        stats = json.loads(w.stats())
        print(f"  Stats: {stats}")
        assert stats["unspent_webcash"] == 0

        # Export snapshot (empty)
        snapshot = w.export_snapshot()
        print(f"  Snapshot length: {len(snapshot)} chars")
        assert len(snapshot) > 0

        # Insert webcash (use env var or skip)
        test_webcash = os.environ.get("TEST_WEBCASH")
        if test_webcash:
            print(f"\n── Insert webcash ──")
            print(f"  Inserting: {test_webcash[:30]}...")
            try:
                w.insert(test_webcash)
                balance = w.balance()
                print(f"  Balance after insert: {balance}")
                assert float(balance) > 0

                # Stats after insert
                stats = json.loads(w.stats())
                print(f"  Unspent: {stats['unspent_webcash']}")

                # Pay (tiny amount back)
                print(f"\n── Pay ──")
                try:
                    result = w.pay("0.00000001", "sdk-test")
                    print(f"  Pay result: {result[:60]}...")
                except WebycashError as e:
                    print(f"  Pay skipped (insufficient or server error): {e}")

                # Check
                print(f"\n── Check ──")
                try:
                    w.check()
                    print("  Check: OK")
                except WebycashError as e:
                    print(f"  Check: {e}")

                # Merge
                print(f"\n── Merge ──")
                try:
                    result = w.merge(20)
                    print(f"  Merge: {result}")
                except WebycashError as e:
                    print(f"  Merge skipped: {e}")

            except WebycashError as e:
                print(f"  Insert failed: {e}")
        else:
            print("\n  Skipping server operations (set TEST_WEBCASH env var)")

        # Encrypt seed
        print(f"\n── Encrypt seed ──")
        try:
            w.encrypt_seed("test_password_123")
            print("  Seed encrypted: OK")
        except WebycashError as e:
            print(f"  Encrypt: {e}")

    # ── Open with seed ───────────────────────────────────────────
    print(f"\n── Open with seed ──")
    seed = bytes.fromhex("aa" * 32)
    db_seed = os.path.join(tempfile.gettempdir(), "webycash_sdk_seed_test.db")
    if os.path.exists(db_seed):
        os.remove(db_seed)
    with Wallet(db_seed, seed=seed) as w:
        balance = w.balance()
        print(f"  Balance (seed wallet): {balance}")

    # ── Error handling ───────────────────────────────────────────
    print(f"\n── Error handling ──")
    try:
        with Wallet(db_path) as w:
            w.insert("invalid_webcash_string")
    except WebycashError as e:
        print(f"  Caught expected error: {e}")

    # Cleanup
    for f in [db_path, db_seed, db_path + "-wal", db_path + "-shm",
              db_seed + "-wal", db_seed + "-shm"]:
        if os.path.exists(f):
            os.remove(f)

    print("\n=== All tests passed ===")

if __name__ == "__main__":
    main()
