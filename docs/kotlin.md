# Kotlin

## Install (Gradle)

```kotlin
dependencies {
    implementation("cash.weby:webycash-sdk:0.1.0")
}
```

## Quick Start

```kotlin
import cash.weby.sdk.*

println(version())

Wallet.open("my_wallet.db").use { w ->
    println(w.balance())
    w.insert("e1.00000000:secret:abcdef...")
    val payment = w.pay("0.5", "coffee")
    println(payment)
}
```

## Usage

```kotlin
import cash.weby.sdk.*

// Open with seed
val seed = ByteArray(32) { 0xAA.toByte() }
val wallet = Wallet.openWithSeed("wallet.db", seed)

// Operations
wallet.insert("e1:secret:abc...")
val result = wallet.pay("0.25", "lunch")
wallet.check()
val merged = wallet.merge(20)
val stats = wallet.stats()
val snapshot = wallet.exportSnapshot()

// Recovery
wallet.recover("aabbcc...", 20)

// Encryption
wallet.encryptSeed("my_password")

// Utilities
val wats = amountParse("1.5")      // 150000000L
val s = amountFormat(150000000L)   // "1.5"

wallet.close()
```

## Error Handling

```kotlin
try {
    Wallet.open("wallet.db").use { w ->
        w.pay("999999", "too much")
    }
} catch (e: WebycashException) {
    println("Code ${e.code}: ${e.message}")
}
```

## Requirements

- JDK 11+
- JNA library (pulled automatically via Gradle)
- Android: include `libwebycash_sdk.so` in `jniLibs/`

## API Reference

See [API.md](API.md) for the full cross-language API documentation.
