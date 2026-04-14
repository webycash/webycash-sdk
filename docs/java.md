# Java

## Install (Maven)

```xml
<dependency>
    <groupId>cash.weby</groupId>
    <artifactId>webycash-sdk</artifactId>
    <version>0.1.0</version>
</dependency>
```

**Gradle:**

```groovy
implementation 'cash.weby:webycash-sdk:0.1.0'
```

## Quick Start

```java
import cash.weby.sdk.WebycashSDK;

System.out.println(WebycashSDK.version());

try (var wallet = new WebycashSDK.Wallet("my_wallet.db")) {
    System.out.println(wallet.balance());
    wallet.insert("e1.00000000:secret:abcdef...");
    String payment = wallet.pay("0.5", "coffee");
    System.out.println(payment);
}
```

## Usage

```java
import cash.weby.sdk.WebycashSDK;

// Open with seed
byte[] seed = new byte[32];
Arrays.fill(seed, (byte) 0xAA);
var wallet = new WebycashSDK.Wallet("wallet.db", seed);

// Operations
wallet.insert("e1:secret:abc...");
String result = wallet.pay("0.25", "lunch");
wallet.check();
String merged = wallet.merge(20);
String stats = wallet.stats();
String snapshot = wallet.exportSnapshot();

// Recovery
wallet.recover("aabbcc...", 20);

// Encryption
wallet.encryptSeed("my_password");

// Utilities
long wats = WebycashSDK.amountParse("1.5");     // 150000000
String s = WebycashSDK.amountFormat(150000000);  // "1.5"

wallet.close();
```

## Error Handling

```java
try (var wallet = new WebycashSDK.Wallet("wallet.db")) {
    wallet.pay("999999", "too much");
} catch (WebycashSDK.WebycashException e) {
    System.err.println("Code " + e.code + ": " + e.getMessage());
}
```

## Requirements

- JDK 11+
- JNA library (declared in pom.xml)

## API Reference

See [API.md](API.md) for the full cross-language API documentation.
