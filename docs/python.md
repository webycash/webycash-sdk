# Python

## Install

```bash
pip install webycash-sdk
```

## Quick Start

```python
from webycash_sdk import Wallet, version

print(version())

with Wallet("my_wallet.db") as w:
    print(w.balance())
    w.insert("e1.00000000:secret:abcdef...")
    payment = w.pay("0.5", "coffee")
    print(payment)
```

## Usage

```python
from webycash_sdk import Wallet, amount_parse, amount_format

# Open with seed
wallet = Wallet("wallet.db", seed=bytes.fromhex("aa" * 32))

# Operations
wallet.insert("e1:secret:abc...")
result = wallet.pay("0.25", "lunch")
wallet.check()
wallet.merge(max_outputs=20)
stats = wallet.stats()          # JSON string
snapshot = wallet.export_snapshot()  # JSON backup

# Recovery
wallet.recover("aabbcc...", gap_limit=20)

# Encryption
wallet.encrypt_seed("my_password")

# Amount utilities
wats = amount_parse("1.5")     # 150000000
s = amount_format(150000000)   # "1.5"

wallet.close()
```

## Error Handling

```python
from webycash_sdk import Wallet, WebycashError

try:
    with Wallet("wallet.db") as w:
        w.pay("999999", "too much")
except WebycashError as e:
    print(f"Failed: {e}")
```

## Requirements

- Python 3.8+
- The native library (`libwebycash_sdk.so` / `.dylib` / `.dll`) must be either:
  - Bundled inside the package (included in wheels)
  - Installed system-wide
  - Placed next to the `webycash_sdk/` package directory

## API Reference

See [API.md](API.md) for the full cross-language API documentation.
