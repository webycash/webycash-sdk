# TypeScript / Node.js

## Install

```bash
npm install webycash-sdk
```

## Quick Start

```typescript
import { Wallet, version } from "webycash-sdk";

console.log(await version());

const wallet = await Wallet.open("my_wallet.db");
console.log(await wallet.balance());
await wallet.insert("e1.00000000:secret:abcdef...");
const payment = await wallet.pay("0.5", "coffee");
console.log(payment);
wallet.close();
```

## Backend Selection

The SDK supports two backends: **FFI** (native library via koffi) and **WASM** (pure WebAssembly). By default, it auto-detects the best backend: FFI in Node.js when the native library is available, WASM otherwise (including browsers).

```typescript
import { Wallet } from "webycash-sdk";

// Auto-detect (default) — tries FFI first, falls back to WASM
const w1 = await Wallet.open("wallet.db");

// Force FFI backend (Node.js only, requires native library)
const w2 = await Wallet.open("wallet.db", { backend: "ffi" });

// Force WASM backend (works everywhere — Node.js and browsers)
const w3 = await Wallet.open("wallet.db", { backend: "wasm" });

console.log(w3.backendName); // "wasm"
```

## Usage

```typescript
import { Wallet, amountParse, amountFormat, WebycashError } from "webycash-sdk";

// Open with seed
const wallet = await Wallet.open("wallet.db", {
  seed: new Uint8Array(32).fill(0xaa),
});

// Operations
await wallet.insert("e1:secret:abc...");
const result = await wallet.pay("0.25", "lunch");
await wallet.check();
await wallet.merge(20);
const stats = await wallet.stats();            // WalletStats object
const snapshot = await wallet.exportSnapshot(); // JSON backup

// Recovery
await wallet.recover("aabbcc...", 20);

// Encryption
await wallet.encryptSeed("my_password");

// Amount utilities
const wats = await amountParse("1.5");     // 150000000n (bigint)
const s = await amountFormat(150000000n);  // "1.5"

wallet.close();
```

## New Operations

```typescript
import { Wallet } from "webycash-sdk";

const wallet = await Wallet.open("wallet.db");

// ── Snapshot import/export ──────────────────────────────────
const snapshot = await wallet.exportSnapshot();  // JSON string
await wallet.importSnapshot(snapshot);           // restore from backup

// ── List unspent webcash ────────────────────────────────────
const unspent = await wallet.listWebcash();      // string[]
console.log(`${unspent.length} unspent outputs`);

// ── Master secret ───────────────────────────────────────────
const hex = await wallet.masterSecret();         // 64-char hex
console.log(`Master secret: ${hex}`);

// ── Password-based encryption ───────────────────────────────
const blob = await wallet.encryptWithPassword("strong_password");
// blob is an encrypted JSON string — safe to store/transmit
await wallet.decryptWithPassword(blob, "strong_password");

// ── Recovery from stored secret ─────────────────────────────
const result = await wallet.recoverFromWallet(20);
console.log(`Recovered ${result.recoveredCount} outputs`);

wallet.close();
```

## WASM Support

The WASM backend works in both Node.js and browsers. See [wasm.md](wasm.md) for browser-specific setup and the full list of WASM-available functions.

```typescript
import { Wallet, version, parseWebcash, sha256Hex } from "webycash-sdk";

// Force WASM — no native library needed
const v = await version("wasm");
console.log(v);

const wallet = await Wallet.open("wallet.db", { backend: "wasm" });
console.log(await wallet.balance());

// Crypto utilities available in WASM
const hash = await sha256Hex("hello");
const parsed = await parseWebcash("e1.00000000:secret:abc123");
console.log(parsed.amountDisplay); // "1.00000000"

wallet.close();
```

## Error Handling

```typescript
import { Wallet, WebycashError } from "webycash-sdk";

try {
    const w = await Wallet.open("wallet.db");
    await w.pay("999999", "too much");
} catch (e) {
    if (e instanceof WebycashError) {
        console.error(`Code ${e.code}: ${e.message}`);
    }
}
```

## Requirements

- Node.js 18+
- **FFI backend:** the `koffi` FFI library (installed automatically) and the native `libwebycash_sdk` shared library
- **WASM backend:** no additional dependencies (bundled)

## API Reference

See [API.md](API.md) for the full cross-language API documentation.
