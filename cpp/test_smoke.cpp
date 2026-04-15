// Offline FFI smoke test — compile:
//   g++ -std=c++17 -I../include test_smoke.cpp -L../native-lib -lwebycash_sdk -o test_smoke
// run: DYLD_LIBRARY_PATH=../native-lib ./test_smoke (macOS)

#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <string>

#ifdef _WIN32
#include <io.h>
#else
#include <unistd.h>
#endif

#include "webycash.h"

static void check(int32_t rc) {
    if (rc != 0) {
        const char* msg = weby_last_error_message();
        std::fprintf(stderr, "FFI error %d: %s\n", (int)rc, msg ? msg : "?");
        std::exit(1);
    }
}

static std::string take_string(char* p) {
    if (!p) return "";
    std::string s(p);
    weby_free_string(p);
    return s;
}

int main() {
    const char* ver = weby_version();
    if (!ver || std::strlen(ver) == 0) {
        std::fprintf(stderr, "empty version\n");
        return 2;
    }

    int64_t wats = 0;
    check(weby_amount_parse("1.5", &wats));
    if (wats != 150000000) {
        std::fprintf(stderr, "parse mismatch\n");
        return 3;
    }
    char* fmt = nullptr;
    check(weby_amount_format(150000000, &fmt));
    std::string s = take_string(fmt);
    if (s != "1.5") {
        std::fprintf(stderr, "format mismatch: %s\n", s.c_str());
        return 4;
    }

#ifndef _WIN32
    char tmpl[] = "/tmp/webycash-sdk-smoke-XXXXXX";
    int fd = mkstemp(tmpl);
    if (fd < 0) {
        std::perror("mkstemp");
        return 5;
    }
    close(fd);
    std::string dbpath(tmpl);
#else
    char* tmp = std::getenv("TEMP");
    std::string dbpath = std::string(tmp ? tmp : ".") + "\\webycash-sdk-smoke-test.db";
#endif

    WebyWallet* w = nullptr;
    check(weby_wallet_open(dbpath.c_str(), &w));
    char* bal = nullptr;
    check(weby_wallet_balance(w, &bal));
    std::string b = take_string(bal);
    if (b.empty()) {
        weby_wallet_free(w);
        std::fprintf(stderr, "empty balance\n");
        return 6;
    }
    weby_wallet_free(w);

#ifndef _WIN32
    std::remove(dbpath.c_str());
#endif

    std::printf("ok\n");
    return 0;
}
