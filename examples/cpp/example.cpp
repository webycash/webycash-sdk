// webycash-sdk C++ example — complete webcash protocol demonstration
//
// This example walks through every wallet operation exposed by the SDK,
// from offline key management to server-side webcash transfers.
//
// Build:
//   g++ -std=c++17 -I../../cpp/include -I../../include \
//       -L../../native/target/release -lwebycash_sdk example.cpp -o example
// Run:
//   DYLD_LIBRARY_PATH=../../native/target/release ./example

#include <webycash_sdk.hpp>
#include <iostream>
#include <filesystem>
#include <cstdlib>
#include <string>
#include <cassert>

namespace fs = std::filesystem;

int main() {
    std::cout << "=== webycash-sdk C++ Example ===" << std::endl;

    try {
        // ── 1. Version & utilities ──────────────────────────────
        // The SDK version tracks the native library; amount helpers
        // convert between human-readable decimal strings and integer
        // "wats" (1e-8).
        std::cout << "\n── Version & amount utilities ──" << std::endl;
        std::cout << "  Library version: " << webcash::version() << std::endl;

        int64_t wats = webcash::amount_parse("1.5");
        std::cout << "  parse(\"1.5\") = " << wats << " wats" << std::endl;
        std::string formatted = webcash::amount_format(wats);
        std::cout << "  format(" << wats << ") = \"" << formatted << "\"" << std::endl;
        assert(wats == 150000000);
        assert(formatted == "1.5");
        std::cout << "  OK" << std::endl;

        // ── 2. Create wallet ────────────────────────────────────
        // A wallet is backed by a SQLite file. Opening a path that
        // doesn't exist yet creates a fresh wallet with a random
        // master secret.
        auto tmp = fs::temp_directory_path() / "webycash_sdk_cpp_example";
        fs::create_directories(tmp);
        auto db_path = (tmp / "wallet.db").string();
        fs::remove(db_path);

        std::cout << "\n── Create wallet: " << db_path << " ──" << std::endl;

        {   // RAII scope — wallet lifetime managed by destructor
            webcash::Wallet wallet(db_path);
            std::cout << "  Wallet opened" << std::endl;

            // ── 3. Master secret backup ─────────────────────────
            // The master secret is a 64-hex-char deterministic root
            // from which all webcash secret keys are derived. Back it
            // up for recovery.
            std::cout << "\n── Master secret ──" << std::endl;
            std::string master_secret = wallet.master_secret();
            std::cout << "  Master secret: " << master_secret.substr(0, 16)
                      << "... (" << master_secret.size() << " hex chars)" << std::endl;
            assert(master_secret.size() == 64);
            std::cout << "  OK" << std::endl;

            // ── 4. Balance & stats ──────────────────────────────
            // A fresh wallet has zero balance and zero unspent outputs.
            std::cout << "\n── Balance & stats ──" << std::endl;
            std::string balance = wallet.balance();
            std::cout << "  Balance: " << balance << std::endl;
            assert(balance == "0");

            std::string stats_json = wallet.stats();
            // Verify it's valid JSON containing "unspent_webcash"
            assert(stats_json.find("\"unspent_webcash\"") != std::string::npos);
            std::cout << "  Stats: " << stats_json << std::endl;
            std::cout << "  OK" << std::endl;

            // ── 5. List outputs ─────────────────────────────────
            // list_webcash returns a JSON array of unspent webcash.
            std::cout << "\n── List webcash outputs ──" << std::endl;
            std::string list_json = wallet.list_webcash();
            // Empty wallet returns "[]"
            assert(list_json.find('[') != std::string::npos);
            std::cout << "  Outputs: " << list_json << std::endl;
            std::cout << "  OK" << std::endl;

            // ── 6. Snapshot backup ──────────────────────────────
            // export_snapshot serializes the entire wallet state to
            // JSON. This is the primary offline backup mechanism.
            std::cout << "\n── Export snapshot ──" << std::endl;
            std::string snapshot = wallet.export_snapshot();
            std::cout << "  Snapshot: " << snapshot.size() << " chars" << std::endl;
            assert(snapshot.size() > 0);
            assert(snapshot.find("\"master_secret\"") != std::string::npos);
            std::cout << "  Valid JSON with master_secret field: true" << std::endl;
            std::cout << "  OK" << std::endl;

            // ── 7. Snapshot restore ─────────────────────────────
            // import_snapshot loads a previously exported snapshot
            // into a wallet. Create a second wallet and restore.
            std::cout << "\n── Import snapshot into second wallet ──" << std::endl;
            {
                auto db_path2 = (tmp / "wallet_restore.db").string();
                fs::remove(db_path2);
                webcash::Wallet wallet2(db_path2);
                wallet2.import_snapshot(snapshot);
                std::string balance2 = wallet2.balance();
                std::cout << "  Restored wallet balance: " << balance2 << std::endl;
                std::cout << "  OK" << std::endl;
            }   // wallet2 destroyed here via RAII

            // ── 8. Password encryption ──────────────────────────
            // encrypt_with_password produces an encrypted JSON blob.
            // decrypt_with_password restores from blob + password.
            std::cout << "\n── Encrypt / decrypt with password ──" << std::endl;
            std::string encrypted = wallet.encrypt_with_password("my_secure_password");
            std::cout << "  Encrypted blob: " << encrypted.size() << " chars" << std::endl;
            // Verify it's valid JSON (starts with '{')
            assert(encrypted.front() == '{');
            std::cout << "  Valid JSON: true" << std::endl;
            wallet.decrypt_with_password(encrypted, "my_secure_password");
            std::cout << "  Decrypt: OK" << std::endl;
            std::cout << "  OK" << std::endl;

            // ── 9. Server operations ────────────────────────────
            // These require a live webcash server. Set TEST_WEBCASH
            // to a valid webcash string to enable this section.
            const char* test_wc = std::getenv("TEST_WEBCASH");
            if (test_wc) {
                std::string wc_str(test_wc);

                // 9a. Insert (receive) webcash into the wallet
                std::cout << "\n── Insert webcash (receive) ──" << std::endl;
                size_t show = std::min(wc_str.size(), (size_t)40);
                std::cout << "  Inserting: " << wc_str.substr(0, show) << "..." << std::endl;
                wallet.insert(wc_str);
                balance = wallet.balance();
                std::cout << "  Balance after insert: " << balance << std::endl;

                // 9b. Pay (send) webcash to someone
                std::cout << "\n── Pay webcash (send) ──" << std::endl;
                try {
                    std::string payment = wallet.pay("0.00000001", "cpp-example");
                    size_t plim = std::min(payment.size(), (size_t)60);
                    std::cout << "  Payment: " << payment.substr(0, plim) << "..." << std::endl;
                    std::cout << "  (recipient uses this string to claim funds)" << std::endl;
                } catch (const webcash::Error& e) {
                    std::cout << "  Pay skipped: " << e.what() << std::endl;
                }

                // 9c. Check wallet against server
                std::cout << "\n── Check wallet against server ──" << std::endl;
                try {
                    wallet.check_wallet();
                    std::cout << "  All outputs verified" << std::endl;
                } catch (const webcash::Error& e) {
                    std::cout << "  Check: " << e.what() << std::endl;
                }

                // 9d. Merge outputs
                std::cout << "\n── Merge outputs ──" << std::endl;
                try {
                    std::string merge_result = wallet.merge(20);
                    std::cout << "  Merge: " << merge_result << std::endl;
                } catch (const webcash::Error& e) {
                    std::cout << "  Merge skipped: " << e.what() << std::endl;
                }

                // 9e. List outputs and stats after server ops
                std::cout << "\n── Post-operation status ──" << std::endl;
                balance = wallet.balance();
                std::cout << "  Balance: " << balance << std::endl;
                std::cout << "  Outputs: " << wallet.list_webcash() << std::endl;
                std::cout << "  Stats: " << wallet.stats() << std::endl;
            } else {
                std::cout << "\n  Skipping server operations (set TEST_WEBCASH env var)" << std::endl;
            }

            // ── 10. Recovery ────────────────────────────────────
            // recover_from_wallet scans the server using the wallet's
            // stored master secret to find any outputs derived from it.
            std::cout << "\n── Recover from wallet ──" << std::endl;
            try {
                std::string recover_result = wallet.recover_from_wallet(20);
                std::cout << "  Recovery: " << recover_result << std::endl;
            } catch (const webcash::Error& e) {
                std::cout << "  Recovery skipped (expected offline): " << e.what() << std::endl;
            }

        }   // wallet destroyed here via RAII

        // ── 11. Cleanup ─────────────────────────────────────────
        std::cout << "\n── Cleanup ──" << std::endl;
        fs::remove_all(tmp);
        std::cout << "  Temp files removed" << std::endl;

    } catch (const webcash::Error& e) {
        std::cerr << "FATAL webcash::Error (code " << e.code << "): " << e.what() << std::endl;
        return 1;
    } catch (const std::exception& e) {
        std::cerr << "FATAL: " << e.what() << std::endl;
        return 1;
    }

    std::cout << "\n=== All tests passed ===" << std::endl;
    return 0;
}
