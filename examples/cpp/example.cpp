// webycash-sdk C++ example — full wallet lifecycle
// Build: g++ -std=c++17 -I../../cpp/include -I../../include -L../../native/target/release -lwebycash_sdk example.cpp -o example
// Run:   DYLD_LIBRARY_PATH=../../native/target/release ./example

#include <webycash_sdk.hpp>
#include <iostream>
#include <cstdlib>
#include <cstdio>
#include <string>

int main() {
    std::cout << "=== webycash-sdk C++ Example ===" << std::endl;
    std::cout << "Version: " << webcash::version() << std::endl;

    // Amount utilities
    std::cout << "\n-- Amount utilities --" << std::endl;
    int64_t wats = webcash::amount_parse("1.5");
    std::cout << "  parse('1.5') = " << wats << " wats" << std::endl;
    std::string s = webcash::amount_format(wats);
    std::cout << "  format(" << wats << ") = '" << s << "'" << std::endl;

    // Wallet lifecycle
    const char* db_path = "/tmp/webycash_sdk_cpp_test.db";
    std::remove(db_path);

    std::cout << "\n-- Open wallet --" << std::endl;
    try {
        webcash::Wallet wallet(db_path);
        std::cout << "  Balance: " << wallet.balance() << std::endl;
        std::cout << "  Stats: " << wallet.stats() << std::endl;

        // Insert if TEST_WEBCASH is set
        const char* test_wc = std::getenv("TEST_WEBCASH");
        if (test_wc) {
            std::cout << "\n-- Insert --" << std::endl;
            wallet.insert(test_wc);
            std::cout << "  Balance: " << wallet.balance() << std::endl;

            std::cout << "\n-- Check --" << std::endl;
            wallet.check_wallet();
            std::cout << "  OK" << std::endl;
        } else {
            std::cout << "  Skipping server ops (set TEST_WEBCASH)" << std::endl;
        }

        // Encrypt seed
        std::cout << "\n-- Encrypt seed --" << std::endl;
        wallet.encrypt_seed("test_password");
        std::cout << "  OK" << std::endl;

    } catch (const webcash::Error& e) {
        std::cerr << "Error " << e.code << ": " << e.what() << std::endl;
        return 1;
    }

    // Error handling
    std::cout << "\n-- Error handling --" << std::endl;
    try {
        webcash::Wallet w2(db_path);
        w2.insert("bad_string");
    } catch (const webcash::Error& e) {
        std::cout << "  Caught: " << e.what() << std::endl;
    }

    std::remove(db_path);
    std::cout << "\n=== All tests passed ===" << std::endl;
    return 0;
}
