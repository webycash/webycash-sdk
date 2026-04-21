package webycash_sdk

import (
	"encoding/json"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

func TestVersion(t *testing.T) {
	v := Version()
	if v == "" {
		t.Fatal("empty version")
	}
}

func TestAmountRoundtrip(t *testing.T) {
	w, err := AmountParse("1.5")
	if err != nil || w != 150000000 {
		t.Fatalf("AmountParse: %v %d", err, w)
	}
	s, err := AmountFormat(150000000)
	if err != nil || s != "1.5" {
		t.Fatalf("AmountFormat: %v %q", err, s)
	}
	w2, err := AmountParse("0.00000001")
	if err != nil || w2 != 1 {
		t.Fatalf("AmountParse tiny: %v %d", err, w2)
	}
	s2, err := AmountFormat(1)
	if err != nil || s2 != "0.00000001" {
		t.Fatalf("AmountFormat tiny: %v %q", err, s2)
	}
}

func TestWalletOpenBalanceClose(t *testing.T) {
	dir := t.TempDir()
	db := filepath.Join(dir, "wallet.db")
	w, err := Open(db)
	if err != nil {
		t.Fatal(err)
	}
	defer w.Close()
	bal, err := w.Balance()
	if err != nil {
		t.Fatal(err)
	}
	if bal != "0" && bal != "0.00000000" {
		t.Fatalf("expected zero balance, got %q", bal)
	}
}

func TestExportImportSnapshot(t *testing.T) {
	dir := t.TempDir()

	db1 := filepath.Join(dir, "wallet1.db")
	w1, err := Open(db1)
	if err != nil {
		t.Fatal(err)
	}
	snapshot, err := w1.ExportSnapshot()
	if err != nil {
		t.Fatal(err)
	}
	w1.Close()
	if snapshot == "" {
		t.Fatal("empty snapshot")
	}

	db2 := filepath.Join(dir, "wallet2.db")
	w2, err := Open(db2)
	if err != nil {
		t.Fatal(err)
	}
	defer w2.Close()
	if err := w2.ImportSnapshot(snapshot); err != nil {
		t.Fatal(err)
	}
	snap2, err := w2.ExportSnapshot()
	if err != nil {
		t.Fatal(err)
	}
	// Compare snapshots by checking both contain master_secret and are valid JSON
	if !strings.Contains(snapshot, "master_secret") {
		t.Fatal("original snapshot missing master_secret")
	}
	if !strings.Contains(snap2, "master_secret") {
		t.Fatal("re-exported snapshot missing master_secret")
	}
	var m1, m2 map[string]interface{}
	if err := json.Unmarshal([]byte(snapshot), &m1); err != nil {
		t.Fatalf("original snapshot is not valid JSON: %v", err)
	}
	if err := json.Unmarshal([]byte(snap2), &m2); err != nil {
		t.Fatalf("re-exported snapshot is not valid JSON: %v", err)
	}
	bal, err := w2.Balance()
	if err != nil {
		t.Fatal(err)
	}
	if bal != "0" && bal != "0.00000000" {
		t.Fatalf("expected zero balance after import, got %q", bal)
	}
}

func TestListWebcashEmpty(t *testing.T) {
	dir := t.TempDir()
	db := filepath.Join(dir, "wallet.db")
	w, err := Open(db)
	if err != nil {
		t.Fatal(err)
	}
	defer w.Close()
	list, err := w.ListWebcash()
	if err != nil {
		t.Fatal(err)
	}
	if list != "[]" {
		t.Fatalf("expected [], got %q", list)
	}
}

func TestMasterSecretFormat(t *testing.T) {
	dir := t.TempDir()
	db := filepath.Join(dir, "wallet.db")
	w, err := Open(db)
	if err != nil {
		t.Fatal(err)
	}
	defer w.Close()
	secret, err := w.MasterSecret()
	if err != nil {
		t.Fatal(err)
	}
	if len(secret) != 64 {
		t.Fatalf("expected 64-char hex, got %d chars: %q", len(secret), secret)
	}
	matched, _ := regexp.MatchString("^[0-9a-f]{64}$", secret)
	if !matched {
		t.Fatalf("master secret not lowercase hex: %q", secret)
	}
}

func TestMasterSecretDeterministic(t *testing.T) {
	dir := t.TempDir()
	var seed [32]byte
	for i := range seed {
		seed[i] = 0x01
	}

	db1 := filepath.Join(dir, "wallet1.db")
	w1, err := OpenWithSeed(db1, seed)
	if err != nil {
		t.Fatal(err)
	}
	secret1, err := w1.MasterSecret()
	if err != nil {
		t.Fatal(err)
	}
	w1.Close()

	db2 := filepath.Join(dir, "wallet2.db")
	w2, err := OpenWithSeed(db2, seed)
	if err != nil {
		t.Fatal(err)
	}
	secret2, err := w2.MasterSecret()
	if err != nil {
		t.Fatal(err)
	}
	w2.Close()

	if secret1 != secret2 {
		t.Fatalf("deterministic mismatch: %q vs %q", secret1, secret2)
	}
	if len(secret1) != 64 {
		t.Fatalf("expected 64-char hex, got %d chars", len(secret1))
	}
}

func TestEncryptDecryptPassword(t *testing.T) {
	dir := t.TempDir()
	db := filepath.Join(dir, "wallet.db")
	w, err := Open(db)
	if err != nil {
		t.Fatal(err)
	}
	defer w.Close()

	encrypted, err := w.EncryptWithPassword("test-password-123")
	if err != nil {
		t.Fatal(err)
	}
	if encrypted == "" {
		t.Fatal("empty encrypted output")
	}

	if err := w.DecryptWithPassword(encrypted, "test-password-123"); err != nil {
		t.Fatal(err)
	}

	bal, err := w.Balance()
	if err != nil {
		t.Fatal(err)
	}
	if bal != "0" && bal != "0.00000000" {
		t.Fatalf("expected zero balance after decrypt, got %q", bal)
	}
}

func TestRecoverFromWalletEmpty(t *testing.T) {
	dir := t.TempDir()
	db := filepath.Join(dir, "wallet.db")
	w, err := Open(db)
	if err != nil {
		t.Fatal(err)
	}
	defer w.Close()

	result, err := w.RecoverFromWallet(5)
	if err != nil {
		// Network errors are acceptable in offline tests
		errMsg := err.Error()
		if strings.Contains(errMsg, "network") || strings.Contains(errMsg, "connection") ||
			strings.Contains(errMsg, "resolve") || strings.Contains(errMsg, "DNS") ||
			strings.Contains(errMsg, "http") || strings.Contains(errMsg, "request") {
			t.Skipf("recover skipped due to network error: %v", err)
			return
		}
		t.Fatal(err)
	}
	if result == "" {
		t.Fatal("empty recover result")
	}
}

func TestImportInvalidJson(t *testing.T) {
	dir := t.TempDir()
	db := filepath.Join(dir, "wallet.db")
	w, err := Open(db)
	if err != nil {
		t.Fatal(err)
	}
	defer w.Close()

	err = w.ImportSnapshot("not valid json {{{")
	if err == nil {
		t.Fatal("expected error for invalid JSON")
	}
	if _, ok := err.(*WebycashError); !ok {
		t.Fatalf("expected WebycashError, got %T: %v", err, err)
	}
}
