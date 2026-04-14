"""Webcash SDK — Python bindings via ctypes."""

import ctypes
import ctypes.util
import os
import platform
import sys
from pathlib import Path


class WebcashError(Exception):
    """Error raised by webcash-sdk operations."""
    pass


def _find_lib():
    """Locate the native webcash_sdk shared library."""
    name = {
        "Linux": "libwebcash_sdk.so",
        "Darwin": "libwebcash_sdk.dylib",
        "Windows": "webcash_sdk.dll",
    }.get(platform.system())
    if name is None:
        raise OSError(f"Unsupported platform: {platform.system()}")
    # Check next to this file first, then system paths
    local = Path(__file__).parent / name
    if local.exists():
        return str(local)
    found = ctypes.util.find_library("webcash_sdk")
    if found:
        return found
    raise OSError(f"Cannot find {name}. Place it next to this module or install system-wide.")


_lib = ctypes.CDLL(_find_lib())

# ── Function signatures ──────────────────────────────────────────

_lib.weby_wallet_open.argtypes = [ctypes.c_char_p, ctypes.POINTER(ctypes.c_void_p)]
_lib.weby_wallet_open.restype = ctypes.c_int32

_lib.weby_wallet_open_with_seed.argtypes = [ctypes.c_char_p, ctypes.c_char_p, ctypes.c_size_t, ctypes.POINTER(ctypes.c_void_p)]
_lib.weby_wallet_open_with_seed.restype = ctypes.c_int32

_lib.weby_wallet_free.argtypes = [ctypes.c_void_p]
_lib.weby_wallet_free.restype = None

_lib.weby_wallet_balance.argtypes = [ctypes.c_void_p, ctypes.POINTER(ctypes.c_char_p)]
_lib.weby_wallet_balance.restype = ctypes.c_int32

_lib.weby_wallet_insert.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
_lib.weby_wallet_insert.restype = ctypes.c_int32

_lib.weby_wallet_pay.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_char_p, ctypes.POINTER(ctypes.c_char_p)]
_lib.weby_wallet_pay.restype = ctypes.c_int32

_lib.weby_wallet_check.argtypes = [ctypes.c_void_p]
_lib.weby_wallet_check.restype = ctypes.c_int32

_lib.weby_wallet_merge.argtypes = [ctypes.c_void_p, ctypes.c_uint32, ctypes.POINTER(ctypes.c_char_p)]
_lib.weby_wallet_merge.restype = ctypes.c_int32

_lib.weby_wallet_recover.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_uint32, ctypes.POINTER(ctypes.c_char_p)]
_lib.weby_wallet_recover.restype = ctypes.c_int32

_lib.weby_wallet_stats.argtypes = [ctypes.c_void_p, ctypes.POINTER(ctypes.c_char_p)]
_lib.weby_wallet_stats.restype = ctypes.c_int32

_lib.weby_wallet_export_snapshot.argtypes = [ctypes.c_void_p, ctypes.POINTER(ctypes.c_char_p)]
_lib.weby_wallet_export_snapshot.restype = ctypes.c_int32

_lib.weby_wallet_encrypt_seed.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
_lib.weby_wallet_encrypt_seed.restype = ctypes.c_int32

_lib.weby_version.argtypes = []
_lib.weby_version.restype = ctypes.c_char_p

_lib.weby_last_error_message.argtypes = []
_lib.weby_last_error_message.restype = ctypes.c_char_p

_lib.weby_amount_parse.argtypes = [ctypes.c_char_p, ctypes.POINTER(ctypes.c_int64)]
_lib.weby_amount_parse.restype = ctypes.c_int32

_lib.weby_amount_format.argtypes = [ctypes.c_int64, ctypes.POINTER(ctypes.c_char_p)]
_lib.weby_amount_format.restype = ctypes.c_int32

_lib.weby_free_string.argtypes = [ctypes.c_char_p]
_lib.weby_free_string.restype = None


def _check(rc: int):
    if rc != 0:
        msg = _lib.weby_last_error_message()
        raise WebcashError(msg.decode() if msg else f"Error code {rc}")


def _take_string(ptr: ctypes.c_char_p) -> str:
    """Read and free a string returned by the FFI."""
    if not ptr.value:
        return ""
    val = ptr.value.decode()
    _lib.weby_free_string(ptr)
    return val


def version() -> str:
    """Get the library version."""
    return _lib.weby_version().decode()


def amount_parse(s: str) -> int:
    """Parse a decimal amount string to integer wats."""
    out = ctypes.c_int64()
    _check(_lib.weby_amount_parse(s.encode(), ctypes.byref(out)))
    return out.value


def amount_format(wats: int) -> str:
    """Format integer wats as a decimal string."""
    out = ctypes.c_char_p()
    _check(_lib.weby_amount_format(wats, ctypes.byref(out)))
    return _take_string(out)


class Wallet:
    """Webcash wallet backed by SQLite.

    Usage::

        with Wallet("my_wallet.db") as w:
            print(w.balance())
            w.insert("e1.00000000:secret:abc...")
    """

    def __init__(self, path: str, *, seed: bytes | None = None):
        self._ptr = ctypes.c_void_p()
        if seed is not None:
            if len(seed) != 32:
                raise ValueError("seed must be exactly 32 bytes")
            _check(_lib.weby_wallet_open_with_seed(
                path.encode(), seed, len(seed), ctypes.byref(self._ptr)
            ))
        else:
            _check(_lib.weby_wallet_open(path.encode(), ctypes.byref(self._ptr)))

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()

    def __del__(self):
        self.close()

    def close(self):
        if self._ptr:
            _lib.weby_wallet_free(self._ptr)
            self._ptr = None

    def balance(self) -> str:
        out = ctypes.c_char_p()
        _check(_lib.weby_wallet_balance(self._ptr, ctypes.byref(out)))
        return _take_string(out)

    def insert(self, webcash: str):
        _check(_lib.weby_wallet_insert(self._ptr, webcash.encode()))

    def pay(self, amount: str, memo: str = "") -> str:
        out = ctypes.c_char_p()
        _check(_lib.weby_wallet_pay(
            self._ptr, amount.encode(), memo.encode(), ctypes.byref(out)
        ))
        return _take_string(out)

    def check(self):
        _check(_lib.weby_wallet_check(self._ptr))

    def merge(self, max_outputs: int = 20) -> str:
        out = ctypes.c_char_p()
        _check(_lib.weby_wallet_merge(self._ptr, max_outputs, ctypes.byref(out)))
        return _take_string(out)

    def recover(self, master_secret_hex: str, gap_limit: int = 20) -> str:
        out = ctypes.c_char_p()
        _check(_lib.weby_wallet_recover(
            self._ptr, master_secret_hex.encode(), gap_limit, ctypes.byref(out)
        ))
        return _take_string(out)

    def stats(self) -> str:
        out = ctypes.c_char_p()
        _check(_lib.weby_wallet_stats(self._ptr, ctypes.byref(out)))
        return _take_string(out)

    def export_snapshot(self) -> str:
        out = ctypes.c_char_p()
        _check(_lib.weby_wallet_export_snapshot(self._ptr, ctypes.byref(out)))
        return _take_string(out)

    def encrypt_seed(self, password: str):
        _check(_lib.weby_wallet_encrypt_seed(self._ptr, password.encode()))
