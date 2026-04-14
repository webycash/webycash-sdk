# Swift

## Install (Swift Package Manager)

Add to your `Package.swift`:

```swift
dependencies: [
    .package(url: "https://github.com/webycash/webycash-sdk", from: "0.1.0")
]
```

Then add `"WebycashSDK"` to your target's dependencies.

## Platforms

iOS 15+, macOS 13+, watchOS 8+, tvOS 15+, visionOS 1+

## Quick Start

```swift
import WebycashSDK

let wallet = try Wallet(path: "my_wallet.db")
print(try wallet.balance())
try wallet.insert("e1.00000000:secret:abcdef...")
let payment = try wallet.pay(amount: "0.5", memo: "coffee")
print(payment)
```

## Usage

```swift
import WebycashSDK

// Open with seed
let seed = Data(repeating: 0xAA, count: 32)
let wallet = try Wallet(path: "wallet.db", seed: seed)

// Operations
try wallet.insert("e1:secret:abc...")
let result = try wallet.pay(amount: "0.25", memo: "lunch")
try wallet.check()
let merged = try wallet.merge(maxOutputs: 20)
let stats = try wallet.stats()
let snapshot = try wallet.exportSnapshot()

// Recovery
let recovered = try wallet.recover(masterSecretHex: "aabbcc...", gapLimit: 20)

// Encryption
try wallet.encryptSeed(password: "my_password")

// Utilities
print(version())
let wats = try amountParse("1.5")       // 150000000
let s = try amountFormat(150000000)     // "1.5"
```

## Error Handling

```swift
do {
    let wallet = try Wallet(path: "wallet.db")
    try wallet.pay(amount: "999999", memo: "too much")
} catch WebycashError.ffi(let code, let message) {
    print("Error \(code): \(message)")
}
```

## API Reference

See [API.md](API.md) for the full cross-language API documentation.
