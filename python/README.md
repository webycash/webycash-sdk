# webycash-sdk (Python)

Python bindings for the Webcash wallet SDK (FFI to `libwebycash_sdk`).

## Install

```bash
pip install webycash-sdk
```

Wheels bundle the native library for common platforms when published.

## Quick start

```python
from webycash_sdk import Wallet, version

print(version())

with Wallet("my_wallet.db") as w:
    print(w.balance())
```

## Development

From the repository root:

```bash
# Build native library, then copy the shared library next to this package:
# cp native/target/release/libwebycash_sdk.* python/webycash_sdk/

pip install -e "python[dev]"
pytest python/tests/
```

Or run `./scripts/dev-python.sh`.

## Documentation

- [Python usage](https://github.com/webycash/webycash-sdk/blob/main/docs/python.md)
- [Cross-language API](https://github.com/webycash/webycash-sdk/blob/main/docs/API.md)

## Requirements

- Python 3.8+
- Native `libwebycash_sdk` (`.so` / `.dylib` / `.dll`) next to `webycash_sdk/`, on `LD_LIBRARY_PATH` / `DYLD_LIBRARY_PATH`, or bundled in the wheel.

## License

MIT — see repository `LICENSE`.
