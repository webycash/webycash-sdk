# Go

## Install

```bash
go get github.com/webycash/webycash-sdk/go
```

Requires `libwebycash_sdk` installed system-wide or in `LD_LIBRARY_PATH` / `DYLD_LIBRARY_PATH`.

## Quick Start

```go
package main

import (
    "fmt"
    webcash "github.com/webycash/webycash-sdk/go"
)

func main() {
    fmt.Println(webcash.Version())

    wallet, err := webcash.Open("my_wallet.db")
    if err != nil { panic(err) }
    defer wallet.Close()

    balance, _ := wallet.Balance()
    fmt.Println(balance)

    wallet.Insert("e1.00000000:secret:abcdef...")
    payment, _ := wallet.Pay("0.5", "coffee")
    fmt.Println(payment)
}
```

## Usage

```go
import webcash "github.com/webycash/webycash-sdk/go"

// Open with seed
var seed [32]byte
for i := range seed { seed[i] = 0xAA }
wallet, _ := webcash.OpenWithSeed("wallet.db", seed)
defer wallet.Close()

// Operations
wallet.Insert("e1:secret:abc...")
result, _ := wallet.Pay("0.25", "lunch")
wallet.Check()
merged, _ := wallet.Merge(20)
stats, _ := wallet.Stats()
snapshot, _ := wallet.ExportSnapshot()

// Recovery
wallet.Recover("aabbcc...", 20)

// Encryption
wallet.EncryptSeed("my_password")

// Utilities
wats, _ := webcash.AmountParse("1.5")     // 150000000
s, _ := webcash.AmountFormat(150000000)    // "1.5"
```

## Error Handling

```go
wallet, err := webcash.Open("wallet.db")
if err != nil {
    if e, ok := err.(*webcash.WebycashError); ok {
        fmt.Printf("Code %d: %s\n", e.Code, e.Message)
    }
}
```

## Requirements

- Go 1.21+
- CGO enabled (`CGO_ENABLED=1`)
- Native library in library search path

## API Reference

See [API.md](API.md) for the full cross-language API documentation.
