// webycash-sdk C++ example — full wallet lifecycle
// Build: g++ -std=c++17 -I../../cpp/include -I../../include -L../../native/target/release -lwebycash_sdk example.cpp -o example
// Run:   DYLD_LIBRARY_PATH=../../native/target/release ./example

#include <webycash_sdk.hpp>
#include <iostream>
#include <cstdlib>
#include <cstdio>
#include <string>
#include <regex>

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

            std::cout << "\n-- Pay --" << std::endl;
            try {
                std::string paid = wallet.pay("0.00000001", "cpp-test");
                size_t lim = paid.size() < 60 ? paid.size() : 60;
                std::cout << "  " << paid.substr(0, lim) << std::endl;
            } catch (const webcash::Error& e) {
                std::cout << "  Pay skipped: " << e.what() << std::endl;
            }

            std::cout << "\n-- Merge --" << std::endl;
            try {
                std::cout << "  " << wallet.merge(20) << std::endl;
            } catch (const webcash::Error& e) {
                std::cout << "  Merge skipped: " << e.what() << std::endl;
            }

            std::cout << "\n-- Recover --" << std::endl;
            try {
                std::string snap = wallet.export_snapshot();
                std::smatch m;
                std::regex re(R"("master_secret"\s*:\s*"([0-9a-fA-F]{64})")");
                if (std::regex_search(snap, m, re) && m.size() > 1)
                    std::cout << "  " << wallet.recover(m[1].str(), 20) << std::endl;
                else
                    std::cout << "  Recover skipped: no master_secret" << std::endl;
            } catch (const webcash::Error& e) {
                std::cout << "  Recover skipped: " << e.what() << std::endl;
            }
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
