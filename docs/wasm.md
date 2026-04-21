# WASM Support

The webycash-sdk includes a pure WebAssembly backend that runs in browsers and Node.js without requiring a native shared library. The WASM backend provides the same wallet API as the FFI backend, plus standalone crypto and webcash-parsing utilities.

## Install

```bash
npm install webycash-sdk
```

## Backend Selection

The SDK auto-detects the best backend. In Node.js it prefers FFI (native performance) and falls back to WASM if the native library is missing. In browsers, WASM is always used.

You can force a specific backend:

```typescript
import { Wallet } from "webycash-sdk";

// Auto-detect (default)
const w1 = await Wallet.open("wallet.db");

// Force WASM
const w2 = await Wallet.open("wallet.db", { backend: "wasm" });

// Force FFI (Node.js only — throws if native lib missing)
const w3 = await Wallet.open("wallet.db", { backend: "ffi" });
```

## Browser Usage

### Vite

```typescript
// src/main.ts
import { Wallet, version } from "webycash-sdk";

async function init() {
  console.log("SDK version:", await version());

  const wallet = await Wallet.open("browser-wallet", { backend: "wasm" });
  console.log("Balance:", await wallet.balance());

  // Insert webcash received from someone
  await wallet.insert("e1.00000000:secret:abcdef...");
  console.log("Balance after insert:", await wallet.balance());

  wallet.close();
}

init();
```

### webpack

```javascript
// webpack.config.js — enable WASM support
module.exports = {
  experiments: {
    asyncWebAssembly: true,
  },
};
```

```typescript
import { Wallet, version } from "webycash-sdk";

const v = await version();
const wallet = await Wallet.open("wallet", { backend: "wasm" });
```

## Node.js Fallback

When the native library is unavailable (e.g., in CI without build tools, or on unsupported architectures), the WASM backend activates automatically:

```typescript
import { Wallet } from "webycash-sdk";

// Auto-detect: tries FFI, falls back to WASM silently
const wallet = await Wallet.open("wallet.db");
console.log(`Using backend: ${wallet.backendName}`); // "ffi" or "wasm"
```

## Wallet API

All wallet methods from [API.md](API.md) are available via WASM. The WASM backend uses in-memory wallet state instead of a SQLite file, so the `path` parameter is ignored.

```typescript
import { Wallet } from "webycash-sdk";

const wallet = await Wallet.open("ignored-in-wasm", { backend: "wasm" });

// Balance, insert, pay, check, merge
console.log(await wallet.balance());
await wallet.insert("e1.00000000:secret:abcdef...");
const payment = await wallet.pay("0.5", "coffee");
await wallet.check();
await wallet.merge(20);

// Stats and snapshots
const stats = await wallet.stats();
const snapshot = await wallet.exportSnapshot();
await wallet.importSnapshot(snapshot);

// List unspent outputs
const unspent = await wallet.listWebcash();

// Master secret for backup
const secret = await wallet.masterSecret();

// Password-based encryption/decryption
const encrypted = await wallet.encryptWithPassword("strong_password");
await wallet.decryptWithPassword(encrypted, "strong_password");

// Recovery using stored master secret
const result = await wallet.recoverFromWallet(20);

// Recovery from an external master secret
await wallet.recover("aabbccdd..." /* 64-char hex */, 20);

// Encrypt seed (database-level)
await wallet.encryptSeed("password");

wallet.close();
```

## Standalone Utilities

These functions work without an open wallet. All accept an optional backend parameter.

### Amount Parsing

```typescript
import { amountParse, amountFormat } from "webycash-sdk";

const wats = await amountParse("1.5");    // 150000000n (bigint)
const s = await amountFormat(150000000n); // "1.5"
```

### Crypto Utilities

```typescript
import {
  generateMasterSecret,
  deriveSecret,
  sha256Hex,
  secretToPublic,
} from "webycash-sdk";

// Generate a random 32-byte master secret (hex)
const master = await generateMasterSecret();

// Derive a child secret using HD wallet derivation
const child = await deriveSecret(master, 0, 1);

// SHA-256 hash
const hash = await sha256Hex("hello");

// Secret to public webcash hash
const pubHash = await secretToPublic("my_secret_string");
```

### Webcash Parsing and Formatting

```typescript
import { parseWebcash, formatWebcash, formatPublicWebcash } from "webycash-sdk";

// Parse a webcash string into components
const parsed = await parseWebcash("e1.00000000:secret:abc123def...");
console.log(parsed.secret);        // "abc123def..."
console.log(parsed.amountWats);    // 100000000n
console.log(parsed.amountDisplay); // "1.00000000"
console.log(parsed.publicHash);    // hex hash

// Format webcash from components
const wc = await formatWebcash("abc123def...", 100000000n);
// "e1.00000000:secret:abc123def..."

// Format public (hashed) webcash
const pub = await formatPublicWebcash("deadbeef...", 100000000n);
// "e1.00000000:public:deadbeef..."
```

## Example: Full Payment Flow

```typescript
import { Wallet, version, amountParse } from "webycash-sdk";

async function paymentDemo() {
  console.log("webycash-sdk", await version());

  // Create wallet (WASM — works in browser)
  const wallet = await Wallet.open("demo", { backend: "wasm" });

  // Check starting balance
  const bal = await wallet.balance();
  console.log(`Starting balance: ${bal}`);

  // Insert received webcash
  const received = "e1.00000000:secret:abcdef0123456789...";
  await wallet.insert(received);
  console.log(`Balance after insert: ${await wallet.balance()}`);

  // Pay someone
  const payment = await wallet.pay("0.5", "payment for goods");
  console.log(`Payment webcash: ${payment}`);
  console.log(`Remaining balance: ${await wallet.balance()}`);

  // Backup: export snapshot
  const backup = await wallet.exportSnapshot();
  console.log(`Backup: ${backup.length} chars`);

  // Backup: password-encrypted export
  const encrypted = await wallet.encryptWithPassword("backup_password");
  console.log(`Encrypted backup: ${encrypted.length} chars`);

  wallet.close();
}

paymentDemo();
```

## Limitations

- The WASM backend uses in-memory state. The `path` parameter to `Wallet.open()` is ignored. Use `exportSnapshot()` / `importSnapshot()` or `encryptWithPassword()` / `decryptWithPassword()` to persist wallet state.
- Performance is lower than the FFI backend for bulk operations (merge, recover with large gap limits).
- The `encryptSeed` method operates on database-level encryption and has limited utility in the WASM backend where there is no database file.
