# TypeScript / Node.js

## Install

```bash
npm install webycash-sdk
```

## Quick Start

```typescript
import { Wallet, version } from "webycash-sdk";

console.log(version());

const wallet = new Wallet("my_wallet.db");
console.log(wallet.balance());
wallet.insert("e1.00000000:secret:abcdef...");
const payment = wallet.pay("0.5", "coffee");
console.log(payment);
wallet.close();
```

## Usage

```typescript
import { Wallet, amountParse, amountFormat, WebycashError } from "webycash-sdk";

// Open with seed
const wallet = new Wallet("wallet.db", Buffer.alloc(32, 0xaa));

// Operations
wallet.insert("e1:secret:abc...");
const result = wallet.pay("0.25", "lunch");
wallet.check();
wallet.merge(20);
const stats = wallet.stats();            // JSON string
const snapshot = wallet.exportSnapshot(); // JSON backup

// Recovery
wallet.recover("aabbcc...", 20);

// Encryption
wallet.encryptSeed("my_password");

// Amount utilities
const wats = amountParse("1.5");     // 150000000n (bigint)
const s = amountFormat(150000000n);  // "1.5"

wallet.close();
```

## Error Handling

```typescript
import { Wallet, WebycashError } from "webycash-sdk";

try {
    const w = new Wallet("wallet.db");
    w.pay("999999", "too much");
} catch (e) {
    if (e instanceof WebycashError) {
        console.error(`Code ${e.code}: ${e.message}`);
    }
}
```

## Requirements

- Node.js 18+
- The `koffi` FFI library (installed automatically)

## API Reference

See [API.md](API.md) for the full cross-language API documentation.
