#pragma once

#include "webycash.h"
#include <memory>
#include <stdexcept>
#include <string>
#include <cstdint>

namespace webcash {

class Error : public std::runtime_error {
public:
    int code;
    Error(int code, const std::string& msg) : std::runtime_error(msg), code(code) {}
};

inline void check(int32_t rc) {
    if (rc != 0) {
        const char* msg = weby_last_error_message();
        throw Error(rc, msg ? msg : "Unknown error");
    }
}

inline std::string take_string(char* ptr) {
    if (!ptr) return "";
    std::string s(ptr);
    weby_free_string(ptr);
    return s;
}

inline std::string version() { return weby_version(); }

inline int64_t amount_parse(const std::string& s) {
    int64_t out;
    check(weby_amount_parse(s.c_str(), &out));
    return out;
}

inline std::string amount_format(int64_t wats) {
    char* out = nullptr;
    check(weby_amount_format(wats, &out));
    return take_string(out);
}

class Wallet {
    WebyWallet* ptr_ = nullptr;

public:
    explicit Wallet(const std::string& path) {
        check(weby_wallet_open(path.c_str(), &ptr_));
    }

    Wallet(const std::string& path, const uint8_t seed[32]) {
        check(weby_wallet_open_with_seed(path.c_str(), seed, 32, &ptr_));
    }

    ~Wallet() { if (ptr_) weby_wallet_free(ptr_); }

    Wallet(const Wallet&) = delete;
    Wallet& operator=(const Wallet&) = delete;
    Wallet(Wallet&& o) noexcept : ptr_(o.ptr_) { o.ptr_ = nullptr; }
    Wallet& operator=(Wallet&& o) noexcept {
        if (ptr_) weby_wallet_free(ptr_);
        ptr_ = o.ptr_; o.ptr_ = nullptr;
        return *this;
    }

    std::string balance() {
        char* out = nullptr;
        check(weby_wallet_balance(ptr_, &out));
        return take_string(out);
    }

    void insert(const std::string& webcash) {
        check(weby_wallet_insert(ptr_, webcash.c_str()));
    }

    std::string pay(const std::string& amount, const std::string& memo = "") {
        char* out = nullptr;
        check(weby_wallet_pay(ptr_, amount.c_str(), memo.c_str(), &out));
        return take_string(out);
    }

    void check_wallet() { webcash::check(weby_wallet_check(ptr_)); }

    std::string merge(uint32_t max_outputs = 20) {
        char* out = nullptr;
        webcash::check(weby_wallet_merge(ptr_, max_outputs, &out));
        return take_string(out);
    }

    std::string recover(const std::string& master_secret_hex, uint32_t gap_limit = 20) {
        char* out = nullptr;
        webcash::check(weby_wallet_recover(ptr_, master_secret_hex.c_str(), gap_limit, &out));
        return take_string(out);
    }

    std::string stats() {
        char* out = nullptr;
        webcash::check(weby_wallet_stats(ptr_, &out));
        return take_string(out);
    }

    std::string export_snapshot() {
        char* out = nullptr;
        webcash::check(weby_wallet_export_snapshot(ptr_, &out));
        return take_string(out);
    }

    void encrypt_seed(const std::string& password) {
        webcash::check(weby_wallet_encrypt_seed(ptr_, password.c_str()));
    }
};

} // namespace webcash
