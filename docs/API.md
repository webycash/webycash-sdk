# webycash-sdk API Reference

This document describes the universal API available in every language binding. Each function behaves identically across all platforms — only the syntax differs.

## Wallet

The `Wallet` is the primary interface. It manages a local SQLite database and communicates with the Webcash server for transaction validation.

### Wallet.open(path)

Open or create a wallet at the given filesystem path.

| Parameter | Type | Description |
|-----------|------|-------------|
| `path` | string | Path to the SQLite database file |

**Returns:** Wallet handle.
**Errors:** `DatabaseError` if the path is inaccessible.

### Wallet.openWithSeed(path, seed)

Open or create a wallet with a caller-provided 32-byte master secret. If the wallet already has a different master secret with existing transactions, returns an error (never silently overwrites).

| Parameter | Type | Description |
|-----------|------|-------------|
| `path` | string | Path to the SQLite database file |
| `seed` | bytes[32] | Exactly 32 bytes of master secret |

**Returns:** Wallet handle.
**Errors:** `InvalidInput` if seed is not 32 bytes, or wallet has conflicting secret.

### Wallet.close()

Free the wallet handle and flush pending state. Called automatically by language-specific cleanup (Python `__exit__`, C# `Dispose`, Swift `deinit`, Go `defer`, etc.).

### Wallet.balance()

Get the current wallet balance as a decimal string (e.g., `"1.50000000"`).

**Returns:** string — decimal amount with up to 8 decimal places.

### Wallet.insert(webcash)

Insert webcash into the wallet via ownership transfer. The library generates a new HD-derived secret, submits a `replace` request to the server, and stores the new secret locally.

| Parameter | Type | Description |
|-----------|------|-------------|
| `webcash` | string | Webcash string, e.g., `"e1.00000000:secret:abcdef..."` |

**Errors:** `InvalidInput` if format is wrong. `ServerError` if the server rejects the replacement. `Wallet` if the webcash was already spent.

### Wallet.pay(amount, memo)

Pay an amount from the wallet. Selects unspent inputs, generates payment and change outputs, submits to the server.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `amount` | string | required | Decimal amount, e.g., `"0.5"` |
| `memo` | string | `""` | Optional memo for the transaction |

**Returns:** string — message containing the payment webcash for the recipient.
**Errors:** `InsufficientFunds` if balance is too low.

### Wallet.check()

Verify all wallet outputs against the server. Detects outputs that have been spent externally.

**Errors:** `ServerError` if spent outputs are found.

### Wallet.merge(maxOutputs)

Consolidate small unspent outputs into fewer larger ones.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `maxOutputs` | integer | `20` | Maximum outputs to merge per batch |

**Returns:** string — summary of the consolidation.

### Wallet.recover(masterSecretHex, gapLimit)

Recover wallet contents from a master secret by scanning the server for used derivation paths.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `masterSecretHex` | string | required | 64-character hex master secret |
| `gapLimit` | integer | `20` | How many consecutive empty paths before stopping |

**Returns:** string — recovery summary (count and amount recovered).

### Wallet.stats()

Get wallet statistics as a JSON string.

**Returns:** JSON string:
```json
{
  "total_webcash": 10,
  "unspent_webcash": 8,
  "spent_webcash": 5,
  "total_balance": "3.50000000"
}
```

### Wallet.exportSnapshot()

Export the full wallet state as a JSON string for backup.

**Returns:** JSON string containing master secret, unspent outputs, spent hashes, and derivation depths.

### Wallet.encryptSeed(password)

Encrypt the wallet database with a password using Argon2 key derivation + AES-256-GCM.

| Parameter | Type | Description |
|-----------|------|-------------|
| `password` | string | Encryption password |

## Utility Functions

### version()

Get the library version string (e.g., `"0.2.10"`).

### amountParse(str)

Parse a decimal amount string to integer wats (1 webcash = 100,000,000 wats).

| Input | Output |
|-------|--------|
| `"1.5"` | `150000000` |
| `"0.00000001"` | `1` |

### amountFormat(wats)

Format integer wats as a decimal string.

| Input | Output |
|-------|--------|
| `150000000` | `"1.5"` |
| `1` | `"0.00000001"` |

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| 0 | Ok | Success |
| 1 | InvalidInput | Bad parameter, parse error |
| 2 | DatabaseError | SQLite error |
| 3 | CryptoError | Encryption/decryption failure |
| 4 | ServerError | Webcash server error |
| 5 | InsufficientFunds | Not enough balance |
| 6 | NetworkError | Connection failure |
| 7 | AuthError | Authentication failure |
| 8 | NotSupported | Operation not supported |
| -1 | Unknown | Unexpected error |

Every function sets a thread-local error message on failure, accessible via the language's error/exception mechanism.
