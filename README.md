<p align="center">

```
····················································································
:                                                                                  :
:                  _                              _                      _  _      :
:  __      __ ___ | |__   _   _   ___  __ _  ___ | |__          ___   __| || | __  :
:  \ \ /\ / // _ \| '_ \ | | | | / __|/ _` |/ __|| '_ \  _____ / __| / _` || |/ /  :
:   \ V  V /|  __/| |_) || |_| || (__| (_| |\__ \| | | ||_____|\__ \| (_| ||   <   :
:    \_/\_/  \___||_.__/  \__, | \___|\__,_||___/|_| |_|       |___/ \__,_||_|\_\  :
:                         |___/                                                    :
:                                                                                  :
····················································································
```

</p>

<p align="center">
<em>Cross-platform Webcash wallet SDK for every language and every platform</em>
</p>

<p align="center">
<a href="https://crates.io/crates/webycash-sdk"><img src="https://img.shields.io/crates/v/webycash-sdk.svg" alt="crates.io"></a>
<a href="https://www.npmjs.com/package/webycash-sdk"><img src="https://img.shields.io/npm/v/webycash-sdk.svg" alt="npm"></a>
<a href="https://pypi.org/project/webycash-sdk/"><img src="https://img.shields.io/pypi/v/webycash-sdk.svg" alt="PyPI"></a>
<a href="https://www.nuget.org/packages/Webycash.SDK/"><img src="https://img.shields.io/nuget/v/Webycash.SDK.svg" alt="NuGet"></a>
<a href="https://github.com/webycash/webycash-sdk/actions/workflows/ci.yml"><img src="https://github.com/webycash/webycash-sdk/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
<a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT"></a>
</p>

---

## Install

| Platform | Package Manager | Command |
|----------|----------------|---------|
| **Rust** | Cargo | `cargo add webylib` (use core library directly) |
| **Python** | pip | `pip install webycash-sdk` |
| **Node.js** | npm | `npm install webycash-sdk` |
| **C# / .NET** | NuGet | `dotnet add package webycash-sdk` |
| **Java** | Maven | `<artifactId>webycash-sdk</artifactId>` (group: `cash.weby`) |
| **Kotlin** | Gradle | `implementation("cash.weby:webycash-sdk:0.1.0")` |
| **Swift** | SPM | `.package(url: "https://github.com/webycash/webycash-sdk", from: "0.1.0")` |
| **Go** | Go modules | `go get github.com/webycash/webycash-sdk/go` |
| **C/C++** | CMake | `FetchContent` or copy `include/webycash.h` + link `libwebycash_sdk` |

## Quick Start

### Python
```python
from webycash_sdk import Wallet

with Wallet("my_wallet.db") as w:
    print(w.balance())
    w.insert("e1.00000000:secret:abc...")
    payment = w.pay("0.5", "coffee")
```

### TypeScript / Node.js
```typescript
import { Wallet } from "webycash-sdk";

const wallet = new Wallet("my_wallet.db");
console.log(wallet.balance());
wallet.insert("e1.00000000:secret:abc...");
const payment = wallet.pay("0.5", "coffee");
wallet.close();
```

### Swift
```swift
import WebycashSDK

let wallet = try Wallet(path: "my_wallet.db")
print(try wallet.balance())
try wallet.insert("e1.00000000:secret:abc...")
let payment = try wallet.pay(amount: "0.5", memo: "coffee")
```

### Kotlin
```kotlin
import cash.weby.sdk.Wallet

Wallet.open("my_wallet.db").use { w ->
    println(w.balance())
    w.insert("e1.00000000:secret:abc...")
    val payment = w.pay("0.5", "coffee")
}
```

### C# / .NET
```csharp
using WebycashSDK;

using var wallet = new Wallet("my_wallet.db");
Console.WriteLine(wallet.Balance());
wallet.Insert("e1.00000000:secret:abc...");
var payment = wallet.Pay("0.5", "coffee");
```

### Go
```go
import webcash "github.com/webycash/webycash-sdk/go"

wallet, _ := webcash.Open("my_wallet.db")
defer wallet.Close()
balance, _ := wallet.Balance()
fmt.Println(balance)
```

### C++
```cpp
#include <webycash_sdk.hpp>

webcash::Wallet wallet("my_wallet.db");
std::cout << wallet.balance() << std::endl;
wallet.insert("e1.00000000:secret:abc...");
auto payment = wallet.pay("0.5", "coffee");
```

### Java
```java
import cash.weby.sdk.WebycashSDK;

try (var wallet = new WebycashSDK.Wallet("my_wallet.db")) {
    System.out.println(wallet.balance());
    wallet.insert("e1.00000000:secret:abc...");
    String payment = wallet.pay("0.5", "coffee");
}
```

## Platform Support

| Platform | Architectures | Languages |
|----------|--------------|-----------|
| **Linux** | x86_64, aarch64 | All |
| **macOS** | x86_64, aarch64 | All |
| **Windows** | x86_64 | All except Go (cgo) |
| **iOS** | aarch64, simulator | Swift, C/C++ |
| **Android** | aarch64, armv7, x86_64 | Kotlin, Java |
| **watchOS** | aarch64 | Swift |
| **tvOS** | aarch64 | Swift |
| **visionOS** | aarch64 | Swift |
| **FreeBSD** | x86_64 | Rust, C/C++, Go |

## Architecture

```
                  ┌──────────────────────────────┐
                  │       Your Application        │
                  └──────────┬───────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────┴────┐         ┌────┴────┐         ┌────┴────┐
   │ Python  │         │  Swift  │         │  C#     │
   │ ctypes  │         │  SPM    │         │P/Invoke │
   └────┬────┘         └────┬────┘         └────┬────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │ C ABI
                  ┌──────────┴───────────────────┐
                  │    libwebycash_sdk (.so/.dylib) │
                  │    (Rust → webylib FFI)        │
                  └──────────┬───────────────────┘
                             │ HTTPS
                  ┌──────────┴───────────────────┐
                  │      webcash.org server        │
                  └──────────────────────────────┘
```

## Documentation

| Guide | Description |
|-------|-------------|
| [API Reference](docs/API.md) | Universal API — every function, every type, every error code |
| [Python](docs/python.md) | pip install, ctypes bindings, error handling |
| [TypeScript / Node.js](docs/typescript.md) | npm install, koffi FFI, async patterns |
| [Swift](docs/swift.md) | SPM install, iOS/macOS/watchOS/tvOS/visionOS |
| [Kotlin](docs/kotlin.md) | Gradle install, JNA bindings, Android |
| [Java](docs/java.md) | Maven/Gradle install, JNA bindings |
| [C# / .NET](docs/csharp.md) | NuGet install, P/Invoke, Unity |
| [Go](docs/go.md) | Go modules, cgo bindings |
| [C / C++](docs/cpp.md) | CMake, header-only C++ wrapper, memory rules |

## Building from Source

```bash
# Build the native library
cd native
cargo build --release

# Output: target/release/libwebycash_sdk.{so,dylib,dll}
```

## License

MIT License — see [LICENSE](LICENSE).
