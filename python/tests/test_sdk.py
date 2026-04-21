"""Offline FFI smoke tests -- no network."""

import json
import os
import re
import shutil
import tempfile

import pytest

from webycash_sdk import Wallet, amount_format, amount_parse, version, WebycashError


def _tmp_wallet_path() -> str:
    """Create a fresh temp directory and return a wallet path inside it."""
    d = tempfile.mkdtemp(prefix="webycash-test-")
    return os.path.join(d, "wallet.db"), d


# ── Tests ────────────────────────────────────────────────────────


def test_version():
    v = version()
    assert isinstance(v, str)
    assert len(v) > 0


def test_amount_roundtrip():
    # 1.5 webcash = 150_000_000 wats
    wats1 = amount_parse("1.5")
    assert wats1 == 150_000_000
    assert amount_format(wats1) == "1.5"

    # smallest unit
    wats2 = amount_parse("0.00000001")
    assert wats2 == 1
    assert amount_format(wats2) == "0.00000001"


def test_wallet_open_balance_close():
    path, d = _tmp_wallet_path()
    try:
        with Wallet(path) as w:
            b = w.balance()
            assert b in ("0", "0.00000000"), f"balance should be zero, got: {b}"
    finally:
        shutil.rmtree(d, ignore_errors=True)


def test_export_import_snapshot():
    path_a, dir_a = _tmp_wallet_path()
    path_b, dir_b = _tmp_wallet_path()
    try:
        with Wallet(path_a) as wa:
            snapshot_a = wa.export_snapshot()
            assert isinstance(snapshot_a, str)
            assert len(snapshot_a) > 0
            # Must be valid JSON
            json.loads(snapshot_a)

        with Wallet(path_b) as wb:
            wb.import_snapshot(snapshot_a)
            snapshot_b = wb.export_snapshot()
            # Compare parsed JSON (key order may differ)
            assert json.loads(snapshot_b) == json.loads(snapshot_a)
    finally:
        shutil.rmtree(dir_a, ignore_errors=True)
        shutil.rmtree(dir_b, ignore_errors=True)


def test_list_webcash_empty():
    path, d = _tmp_wallet_path()
    try:
        with Wallet(path) as w:
            raw = w.list_webcash()
            # FFI returns JSON string; parse it
            lst = json.loads(raw) if isinstance(raw, str) else raw
            assert isinstance(lst, list)
            assert len(lst) == 0
    finally:
        shutil.rmtree(d, ignore_errors=True)


def test_master_secret_format():
    path, d = _tmp_wallet_path()
    try:
        with Wallet(path) as w:
            secret = w.master_secret
            assert isinstance(secret, str)
            assert len(secret) == 64, "master secret must be 64 hex chars"
            assert re.match(r"^[0-9a-f]{64}$", secret), "master secret must be lowercase hex"
    finally:
        shutil.rmtree(d, ignore_errors=True)


def test_master_secret_deterministic():
    seed = bytes(32)  # all zeros

    path1, dir1 = _tmp_wallet_path()
    path2, dir2 = _tmp_wallet_path()
    try:
        with Wallet(path1, seed=seed) as w1, Wallet(path2, seed=seed) as w2:
            s1 = w1.master_secret
            s2 = w2.master_secret
            assert re.match(r"^[0-9a-f]{64}$", s1)
            assert s1 == s2, "same seed must produce same master secret"
    finally:
        shutil.rmtree(dir1, ignore_errors=True)
        shutil.rmtree(dir2, ignore_errors=True)


def test_encrypt_decrypt_password():
    path, d = _tmp_wallet_path()
    try:
        with Wallet(path) as w:
            encrypted = w.encrypt_with_password("test123")
            assert isinstance(encrypted, str)
            assert len(encrypted) > 0
            # Must be valid JSON
            json.loads(encrypted)

            w.decrypt_with_password(encrypted, "test123")

            # Wallet still functional after decrypt round-trip
            b = w.balance()
            assert isinstance(b, str)
            assert len(b) > 0
    finally:
        shutil.rmtree(d, ignore_errors=True)


def test_recover_from_wallet_empty():
    path, d = _tmp_wallet_path()
    try:
        with Wallet(path) as w:
            # Recovery on empty wallet may succeed or fail with network error.
            # Either outcome is valid -- key test is it doesn't crash.
            try:
                w.recover_from_wallet(gap_limit=5)
            except WebycashError:
                pass  # Network/server errors expected offline
    finally:
        shutil.rmtree(d, ignore_errors=True)


def test_import_invalid_json():
    path, d = _tmp_wallet_path()
    try:
        with Wallet(path) as w:
            with pytest.raises(WebycashError):
                w.import_snapshot("not json")
    finally:
        shutil.rmtree(d, ignore_errors=True)
