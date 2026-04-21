// Offline FFI smoke test -- compile:
//   g++ -std=c++17 -Iinclude -I../include test_smoke.cpp -L../native-lib -lwebycash_sdk -o test_smoke
// run: DYLD_LIBRARY_PATH=../native-lib ./test_smoke (macOS)

#include <cassert>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <string>

#ifdef _WIN32
#include <io.h>
#else
#include <unistd.h>
#endif

#include "webycash_sdk.hpp"

static int tests_run = 0;
static int tests_passed = 0;

#define RUN_TEST(fn)                                                       \
    do {                                                                   \
        tests_run++;                                                       \
        std::printf("  %-40s ", #fn);                                      \
        try {                                                              \
            fn();                                                          \
            tests_passed++;                                                \
            std::printf("ok\n");                                           \
        } catch (const std::exception& e) {                                \
            std::printf("FAIL: %s\n", e.what());                           \
        }                                                                  \
    } while (0)

static std::string make_tmp_path(const char* tag) {
#ifndef _WIN32
    std::string tmpl = std::string("/tmp/webycash-test-") + tag + "-XXXXXX";
    char buf[256];
    std::strncpy(buf, tmpl.c_str(), sizeof(buf) - 1);
    buf[sizeof(buf) - 1] = '\0';
    int fd = mkstemp(buf);
    if (fd < 0) {
        std::perror("mkstemp");
        std::exit(99);
    }
    close(fd);
    return std::string(buf);
#else
    char* tmp = std::getenv("TEMP");
    return std::string(tmp ? tmp : ".") + "\\webycash-test-" + tag + ".db";
#endif
}

static void cleanup(const std::string& path) {
    std::remove(path.c_str());
}

// 1. test_version
static void test_version() {
    std::string v = webcash::version();
    assert(!v.empty());
}

// 2. test_amount_roundtrip
static void test_amount_roundtrip() {
    assert(webcash::amount_parse("1.5") == 150000000);
    assert(webcash::amount_format(150000000) == "1.5");
    assert(webcash::amount_parse("0.00000001") == 1);
    assert(webcash::amount_format(1) == "0.00000001");
}

// 3. test_wallet_open_balance_close
static void test_wallet_open_balance_close() {
    auto path = make_tmp_path("balance");
    {
        webcash::Wallet w(path);
        std::string bal = w.balance();
        assert(bal == "0" || bal == "0.00000000");
    }
    cleanup(path);
}

// 4. test_export_import_snapshot
static void test_export_import_snapshot() {
    auto path1 = make_tmp_path("snap1");
    auto path2 = make_tmp_path("snap2");
    std::string snapshot;
    {
        webcash::Wallet w1(path1);
        snapshot = w1.export_snapshot();
        assert(!snapshot.empty());
        assert(snapshot.find('{') != std::string::npos);
    }
    {
        webcash::Wallet w2(path2);
        w2.import_snapshot(snapshot);
        std::string snap2 = w2.export_snapshot();
        // Both snapshots should contain master_secret and be valid JSON
        assert(snapshot.find("master_secret") != std::string::npos);
        assert(snap2.find("master_secret") != std::string::npos);
        assert(snap2.find('{') != std::string::npos);
        std::string bal = w2.balance();
        assert(bal == "0" || bal == "0.00000000");
    }
    cleanup(path1);
    cleanup(path2);
}

// 5. test_list_webcash_empty
static void test_list_webcash_empty() {
    auto path = make_tmp_path("list");
    {
        webcash::Wallet w(path);
        std::string list = w.list_webcash();
        assert(list == "[]");
    }
    cleanup(path);
}

// 6. test_master_secret_format
static void test_master_secret_format() {
    auto path = make_tmp_path("msf");
    {
        webcash::Wallet w(path);
        std::string secret = w.master_secret();
        assert(secret.length() == 64);
        for (char c : secret) {
            assert((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f'));
        }
    }
    cleanup(path);
}

// 7. test_master_secret_deterministic
static void test_master_secret_deterministic() {
    uint8_t seed[32];
    std::memset(seed, 0x01, 32);

    auto path1 = make_tmp_path("det1");
    auto path2 = make_tmp_path("det2");
    std::string secret1, secret2;
    {
        webcash::Wallet w1(path1, seed);
        secret1 = w1.master_secret();
    }
    {
        webcash::Wallet w2(path2, seed);
        secret2 = w2.master_secret();
    }
    assert(secret1 == secret2);
    assert(secret1.length() == 64);
    cleanup(path1);
    cleanup(path2);
}

// 8. test_encrypt_decrypt_password
static void test_encrypt_decrypt_password() {
    auto path = make_tmp_path("enc");
    {
        webcash::Wallet w(path);
        std::string encrypted = w.encrypt_with_password("test-password-123");
        assert(!encrypted.empty());

        w.decrypt_with_password(encrypted, "test-password-123");

        std::string bal = w.balance();
        assert(bal == "0" || bal == "0.00000000");
    }
    cleanup(path);
}

// 9. test_recover_from_wallet_empty
static void test_recover_from_wallet_empty() {
    auto path = make_tmp_path("recov");
    {
        webcash::Wallet w(path);
        try {
            std::string result = w.recover_from_wallet(5);
            assert(!result.empty());
        } catch (const webcash::Error& e) {
            // Network errors are acceptable in offline tests
            std::string msg(e.what());
            bool is_network =
                msg.find("network") != std::string::npos ||
                msg.find("connection") != std::string::npos ||
                msg.find("resolve") != std::string::npos ||
                msg.find("DNS") != std::string::npos ||
                msg.find("http") != std::string::npos ||
                msg.find("request") != std::string::npos;
            if (!is_network) throw;
            // network error is acceptable, test passes
        }
    }
    cleanup(path);
}

// 10. test_import_invalid_json
static void test_import_invalid_json() {
    auto path = make_tmp_path("badjson");
    {
        webcash::Wallet w(path);
        bool caught = false;
        try {
            w.import_snapshot("not valid json {{{");
        } catch (const webcash::Error& e) {
            caught = true;
            assert(e.code != 0);
        }
        assert(caught);
    }
    cleanup(path);
}

int main() {
    std::printf("webycash-sdk C++ smoke tests\n");

    RUN_TEST(test_version);
    RUN_TEST(test_amount_roundtrip);
    RUN_TEST(test_wallet_open_balance_close);
    RUN_TEST(test_export_import_snapshot);
    RUN_TEST(test_list_webcash_empty);
    RUN_TEST(test_master_secret_format);
    RUN_TEST(test_master_secret_deterministic);
    RUN_TEST(test_encrypt_decrypt_password);
    RUN_TEST(test_recover_from_wallet_empty);
    RUN_TEST(test_import_invalid_json);

    std::printf("\n%d/%d tests passed\n", tests_passed, tests_run);
    return (tests_passed == tests_run) ? 0 : 1;
}
