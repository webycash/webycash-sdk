package webycash_sdk

import (
	"path/filepath"
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
	if bal == "" {
		t.Fatal("empty balance")
	}
}
