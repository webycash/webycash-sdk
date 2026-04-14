/* webycash-sdk C API — MIT License (c) 2026 Webycash */
#ifndef WEBYCASH_SDK_H
#define WEBYCASH_SDK_H

#include <stdint.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

/* ── Error codes ─────────────────────────────────────────────── */

enum WebyErrorCode {
    WEBY_OK               =  0,
    WEBY_INVALID_INPUT     =  1,
    WEBY_DATABASE_ERROR    =  2,
    WEBY_CRYPTO_ERROR      =  3,
    WEBY_SERVER_ERROR      =  4,
    WEBY_INSUFFICIENT_FUNDS =  5,
    WEBY_NETWORK_ERROR     =  6,
    WEBY_AUTH_ERROR         =  7,
    WEBY_NOT_SUPPORTED     =  8,
    WEBY_UNKNOWN           = -1,
};

/* ── Opaque types ────────────────────────────────────────────── */

typedef struct WebyWallet WebyWallet;

/* ── Lifecycle ───────────────────────────────────────────────── */

int32_t weby_wallet_open(const char *path, WebyWallet **out_wallet);

int32_t weby_wallet_open_with_seed(
    const char *path,
    const uint8_t *seed_ptr,
    size_t seed_len,
    WebyWallet **out_wallet
);

void weby_wallet_free(WebyWallet *wallet);

/* ── Operations ──────────────────────────────────────────────── */

int32_t weby_wallet_balance(const WebyWallet *wallet, char **out_balance);

int32_t weby_wallet_insert(const WebyWallet *wallet, const char *webcash_str);

int32_t weby_wallet_pay(
    const WebyWallet *wallet,
    const char *amount_str,
    const char *memo,
    char **out_webcash
);

int32_t weby_wallet_check(const WebyWallet *wallet);

int32_t weby_wallet_merge(
    const WebyWallet *wallet,
    uint32_t max_outputs,
    char **out_result
);

int32_t weby_wallet_recover(
    const WebyWallet *wallet,
    const char *master_secret_hex,
    uint32_t gap_limit,
    char **out_result
);

/* ── Inspection ──────────────────────────────────────────────── */

int32_t weby_wallet_stats(const WebyWallet *wallet, char **out_json);

int32_t weby_wallet_export_snapshot(const WebyWallet *wallet, char **out_json);

/* ── Encryption ──────────────────────────────────────────────── */

int32_t weby_wallet_encrypt_seed(const WebyWallet *wallet, const char *password);

/* ── Utilities ───────────────────────────────────────────────── */

const char *weby_version(void);

const char *weby_last_error_message(void);

int32_t weby_amount_parse(const char *amount_str, int64_t *out_wats);

int32_t weby_amount_format(int64_t wats, char **out_str);

void weby_free_string(char *ptr);

#ifdef __cplusplus
}
#endif

#endif /* WEBYCASH_SDK_H */
