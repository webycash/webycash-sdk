# C / C++

## Install

**CMake FetchContent:**

```cmake
include(FetchContent)
FetchContent_Declare(webycash-sdk
    GIT_REPOSITORY https://github.com/webycash/webycash-sdk
    GIT_TAG v0.1.0
)
FetchContent_MakeAvailable(webycash-sdk)
target_link_libraries(myapp PRIVATE webycash_sdk)
```

**Manual:** Copy `include/webycash.h` and link against `libwebycash_sdk`.

## Quick Start (C)

```c
#include "webycash.h"
#include <stdio.h>

int main() {
    printf("Version: %s\n", weby_version());

    WebyWallet *wallet = NULL;
    if (weby_wallet_open("my_wallet.db", &wallet) != 0) {
        printf("Error: %s\n", weby_last_error_message());
        return 1;
    }

    char *balance = NULL;
    weby_wallet_balance(wallet, &balance);
    printf("Balance: %s\n", balance);
    weby_free_string(balance);

    weby_wallet_free(wallet);
    return 0;
}
```

## Quick Start (C++)

```cpp
#include <webycash_sdk.hpp>
#include <iostream>

int main() {
    std::cout << webcash::version() << std::endl;

    webcash::Wallet wallet("my_wallet.db");
    std::cout << wallet.balance() << std::endl;
    wallet.insert("e1.00000000:secret:abcdef...");
    auto payment = wallet.pay("0.5", "coffee");
    std::cout << payment << std::endl;
}
```

The C++ wrapper (`webycash_sdk.hpp`) is header-only with RAII resource management.

## Error Handling

**C:** Check the `int32_t` return code. Non-zero means failure — call `weby_last_error_message()` for details.

**C++:** Functions throw `webcash::Error` (inherits `std::runtime_error`) with a `.code` field.

```cpp
try {
    webcash::Wallet wallet("wallet.db");
    wallet.pay("999999");
} catch (const webcash::Error& e) {
    std::cerr << "Code " << e.code << ": " << e.what() << std::endl;
}
```

## Memory Rules

- Strings returned via `char**` parameters must be freed with `weby_free_string()`.
- `weby_version()` returns a static pointer — do **not** free.
- `weby_last_error_message()` is thread-local, valid until the next FFI call — do **not** free.
- `WebyWallet*` handles must be freed with `weby_wallet_free()`.

## API Reference

See [API.md](API.md) for the full cross-language API documentation.
