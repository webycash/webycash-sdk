// Package webycash_sdk provides Go bindings for the Webcash wallet SDK.
package webycash_sdk

/*
#cgo LDFLAGS: -lwebycash_sdk
#include <stdlib.h>
#include <stdint.h>

extern int32_t weby_wallet_open(const char *path, void **out_wallet);
extern int32_t weby_wallet_open_with_seed(const char *path, const uint8_t *seed, size_t seed_len, void **out_wallet);
extern void weby_wallet_free(void *wallet);
extern int32_t weby_wallet_balance(const void *wallet, char **out);
extern int32_t weby_wallet_insert(const void *wallet, const char *webcash);
extern int32_t weby_wallet_pay(const void *wallet, const char *amount, const char *memo, char **out);
extern int32_t weby_wallet_check(const void *wallet);
extern int32_t weby_wallet_merge(const void *wallet, uint32_t max, char **out);
extern int32_t weby_wallet_recover(const void *wallet, const char *secret, uint32_t gap, char **out);
extern int32_t weby_wallet_stats(const void *wallet, char **out);
extern int32_t weby_wallet_export_snapshot(const void *wallet, char **out);
extern int32_t weby_wallet_encrypt_seed(const void *wallet, const char *password);
extern const char *weby_version();
extern const char *weby_last_error_message();
extern int32_t weby_amount_parse(const char *s, int64_t *out);
extern int32_t weby_amount_format(int64_t wats, char **out);
extern void weby_free_string(char *ptr);
*/
import "C"
import (
	"fmt"
	"unsafe"
)

type WebycashError struct {
	Code    int
	Message string
}

func (e *WebycashError) Error() string { return e.Message }

func check(rc C.int32_t) error {
	if rc == 0 {
		return nil
	}
	msg := C.weby_last_error_message()
	return &WebycashError{Code: int(rc), Message: C.GoString(msg)}
}

func takeString(p *C.char) string {
	if p == nil {
		return ""
	}
	s := C.GoString(p)
	C.weby_free_string(p)
	return s
}

// Version returns the library version.
func Version() string { return C.GoString(C.weby_version()) }

// AmountParse parses a decimal amount string to integer wats.
func AmountParse(s string) (int64, error) {
	cs := C.CString(s)
	defer C.free(unsafe.Pointer(cs))
	var out C.int64_t
	if err := check(C.weby_amount_parse(cs, &out)); err != nil {
		return 0, err
	}
	return int64(out), nil
}

// AmountFormat formats integer wats as a decimal string.
func AmountFormat(wats int64) (string, error) {
	var out *C.char
	if err := check(C.weby_amount_format(C.int64_t(wats), &out)); err != nil {
		return "", err
	}
	return takeString(out), nil
}

// Wallet is a Webcash wallet backed by SQLite.
type Wallet struct {
	ptr unsafe.Pointer
}

// Open opens or creates a wallet at the given path.
func Open(path string) (*Wallet, error) {
	cs := C.CString(path)
	defer C.free(unsafe.Pointer(cs))
	var ptr unsafe.Pointer
	if err := check(C.weby_wallet_open(cs, &ptr)); err != nil {
		return nil, err
	}
	return &Wallet{ptr: ptr}, nil
}

// OpenWithSeed opens or creates a wallet with a 32-byte seed.
func OpenWithSeed(path string, seed [32]byte) (*Wallet, error) {
	cs := C.CString(path)
	defer C.free(unsafe.Pointer(cs))
	var ptr unsafe.Pointer
	if err := check(C.weby_wallet_open_with_seed(cs, (*C.uint8_t)(&seed[0]), 32, &ptr)); err != nil {
		return nil, err
	}
	return &Wallet{ptr: ptr}, nil
}

// Close frees the wallet.
func (w *Wallet) Close() {
	if w.ptr != nil {
		C.weby_wallet_free(w.ptr)
		w.ptr = nil
	}
}

func (w *Wallet) Balance() (string, error) {
	var out *C.char
	if err := check(C.weby_wallet_balance(w.ptr, &out)); err != nil {
		return "", err
	}
	return takeString(out), nil
}

func (w *Wallet) Insert(webcash string) error {
	cs := C.CString(webcash)
	defer C.free(unsafe.Pointer(cs))
	return check(C.weby_wallet_insert(w.ptr, cs))
}

func (w *Wallet) Pay(amount, memo string) (string, error) {
	ca := C.CString(amount)
	defer C.free(unsafe.Pointer(ca))
	cm := C.CString(memo)
	defer C.free(unsafe.Pointer(cm))
	var out *C.char
	if err := check(C.weby_wallet_pay(w.ptr, ca, cm, &out)); err != nil {
		return "", err
	}
	return takeString(out), nil
}

func (w *Wallet) Check() error   { return check(C.weby_wallet_check(w.ptr)) }
func (w *Wallet) Merge(max uint32) (string, error) {
	var out *C.char
	if err := check(C.weby_wallet_merge(w.ptr, C.uint32_t(max), &out)); err != nil {
		return "", err
	}
	return takeString(out), nil
}

func (w *Wallet) Recover(masterSecretHex string, gapLimit uint32) (string, error) {
	cs := C.CString(masterSecretHex)
	defer C.free(unsafe.Pointer(cs))
	var out *C.char
	if err := check(C.weby_wallet_recover(w.ptr, cs, C.uint32_t(gapLimit), &out)); err != nil {
		return "", err
	}
	return takeString(out), nil
}

func (w *Wallet) Stats() (string, error) {
	var out *C.char
	if err := check(C.weby_wallet_stats(w.ptr, &out)); err != nil {
		return "", err
	}
	return takeString(out), nil
}

func (w *Wallet) ExportSnapshot() (string, error) {
	var out *C.char
	if err := check(C.weby_wallet_export_snapshot(w.ptr, &out)); err != nil {
		return "", err
	}
	return takeString(out), nil
}

func (w *Wallet) EncryptSeed(password string) error {
	cs := C.CString(password)
	defer C.free(unsafe.Pointer(cs))
	return check(C.weby_wallet_encrypt_seed(w.ptr, cs))
}

func init() {
	_ = fmt.Sprintf // suppress unused import
}
