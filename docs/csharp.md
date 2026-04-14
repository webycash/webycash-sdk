# C# / .NET

## Install

```bash
dotnet add package webycash-sdk
```

## Quick Start

```csharp
using WebycashSDK;

Console.WriteLine(Webcash.Version());

using var wallet = new Wallet("my_wallet.db");
Console.WriteLine(wallet.Balance());
wallet.Insert("e1.00000000:secret:abcdef...");
var payment = wallet.Pay("0.5", "coffee");
Console.WriteLine(payment);
```

## Usage

```csharp
using WebycashSDK;

// Open with seed
byte[] seed = Enumerable.Repeat((byte)0xAA, 32).ToArray();
using var wallet = new Wallet("wallet.db", seed);

// Operations
wallet.Insert("e1:secret:abc...");
var result = wallet.Pay("0.25", "lunch");
wallet.Check();
var merged = wallet.Merge(20);
var stats = wallet.Stats();
var snapshot = wallet.ExportSnapshot();

// Recovery
wallet.Recover("aabbcc...", 20);

// Encryption
wallet.EncryptSeed("my_password");

// Utilities
long wats = Webcash.AmountParse("1.5");        // 150000000
string s = Webcash.AmountFormat(150000000);     // "1.5"
```

## Error Handling

```csharp
try
{
    using var wallet = new Wallet("wallet.db");
    wallet.Pay("999999", "too much");
}
catch (WebycashException e)
{
    Console.Error.WriteLine($"Code {e.Code}: {e.Message}");
}
```

## Platforms

- .NET 8.0+
- Unity (via NuGet)
- Works on Windows, Linux, macOS

## API Reference

See [API.md](API.md) for the full cross-language API documentation.
