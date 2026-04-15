"""Offline FFI smoke tests — no network."""

import os
import tempfile

from webycash_sdk import Wallet, amount_format, amount_parse, version


def test_version():
    v = version()
    assert isinstance(v, str)
    assert len(v) > 0


def test_amount_roundtrip():
    assert amount_parse("1.5") == 150_000_000
    assert amount_format(150_000_000) == "1.5"
    assert amount_parse("0.00000001") == 1
    assert amount_format(1) == "0.00000001"


def test_wallet_open_balance_close():
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    try:
        with Wallet(path) as w:
            b = w.balance()
            assert isinstance(b, str)
            assert len(b) > 0
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass
