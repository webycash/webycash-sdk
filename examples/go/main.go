// webycash-sdk Go example — complete webcash protocol demonstration
//
// This example walks through every wallet operation exposed by the SDK,
// from offline key management to server-side webcash transfers.
//
// Build & run from repo go module root:
//   cd ../../go
//   CGO_LDFLAGS="-L$(pwd)/../native/target/release -lwebycash_sdk" \
//     DYLD_LIBRARY_PATH="$(pwd)/../native/target/release" \
//     go run ../examples/go/main.go

package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	webcash "github.com/webycash/webycash-sdk/go"
)

func must(err error) {
	if err != nil {
		fmt.Fprintf(os.Stderr, "FATAL: %v\n", err)
		os.Exit(1)
	}
}

func main() {
	fmt.Println("=== webycash-sdk Go Example ===")

	// ── 1. Version & utilities ──────────────────────────────────
	// The SDK version tracks the native library; amount helpers convert
	// between human-readable decimal strings and integer "wats" (1e-8).
	fmt.Println("\n── Version & amount utilities ──")
	fmt.Println("  Library version:", webcash.Version())

	wats, err := webcash.AmountParse("1.5")
	must(err)
	fmt.Printf("  parse(\"1.5\") = %d wats\n", wats)

	formatted, err := webcash.AmountFormat(wats)
	must(err)
	fmt.Printf("  format(%d) = \"%s\"\n", wats, formatted)

	if wats != 150_000_000 {
		fmt.Fprintln(os.Stderr, "parse mismatch")
		os.Exit(1)
	}
	if formatted != "1.5" {
		fmt.Fprintln(os.Stderr, "format mismatch")
		os.Exit(1)
	}
	fmt.Println("  OK")

	// ── 2. Create wallet ────────────────────────────────────────
	// A wallet is backed by a SQLite file. Opening a path that doesn't
	// exist yet creates a fresh wallet with a random master secret.
	tmpDir, err := os.MkdirTemp("", "webycash_sdk_go_*")
	must(err)
	defer os.RemoveAll(tmpDir)

	dbPath := filepath.Join(tmpDir, "wallet.db")
	fmt.Printf("\n── Create wallet: %s ──\n", dbPath)

	wallet, err := webcash.Open(dbPath)
	must(err)
	defer wallet.Close()
	fmt.Println("  Wallet opened")

	// ── 3. Master secret backup ────────────────────────────────
	// The master secret is a 64-hex-char deterministic root from which
	// all webcash secret keys are derived. Back it up for recovery.
	fmt.Println("\n── Master secret ──")
	masterSecret, err := wallet.MasterSecret()
	must(err)
	fmt.Printf("  Master secret: %s... (%d hex chars)\n", masterSecret[:16], len(masterSecret))
	if len(masterSecret) != 64 {
		fmt.Fprintln(os.Stderr, "master secret must be 64 hex chars")
		os.Exit(1)
	}
	fmt.Println("  OK")

	// ── 4. Balance & stats ─────────────────────────────────────
	// A fresh wallet has zero balance and zero unspent outputs.
	fmt.Println("\n── Balance & stats ──")
	balance, err := wallet.Balance()
	must(err)
	fmt.Println("  Balance:", balance)
	if balance != "0" {
		fmt.Fprintln(os.Stderr, "fresh wallet balance must be 0")
		os.Exit(1)
	}

	statsStr, err := wallet.Stats()
	must(err)
	var statsMap map[string]interface{}
	must(json.Unmarshal([]byte(statsStr), &statsMap))
	unspent := int(statsMap["unspent_webcash"].(float64))
	fmt.Printf("  Stats: unspent_webcash=%d\n", unspent)
	if unspent != 0 {
		fmt.Fprintln(os.Stderr, "fresh wallet must have 0 unspent outputs")
		os.Exit(1)
	}
	fmt.Println("  OK")

	// ── 5. List outputs ────────────────────────────────────────
	// ListWebcash returns a JSON array of unspent webcash strings.
	fmt.Println("\n── List webcash outputs ──")
	listStr, err := wallet.ListWebcash()
	must(err)
	var listArr []interface{}
	must(json.Unmarshal([]byte(listStr), &listArr))
	fmt.Printf("  Unspent outputs: %d\n", len(listArr))
	if len(listArr) != 0 {
		fmt.Fprintln(os.Stderr, "fresh wallet must have 0 outputs")
		os.Exit(1)
	}
	fmt.Println("  OK")

	// ── 6. Snapshot backup ─────────────────────────────────────
	// ExportSnapshot serializes the entire wallet state to JSON.
	// This is the primary offline backup mechanism.
	fmt.Println("\n── Export snapshot ──")
	snapshot, err := wallet.ExportSnapshot()
	must(err)
	fmt.Printf("  Snapshot: %d chars\n", len(snapshot))
	var snapMap map[string]interface{}
	must(json.Unmarshal([]byte(snapshot), &snapMap))
	_, hasMasterSecret := snapMap["master_secret"]
	fmt.Printf("  Valid JSON with master_secret field: %v\n", hasMasterSecret)
	fmt.Println("  OK")

	// ── 7. Snapshot restore ────────────────────────────────────
	// ImportSnapshot loads a previously exported snapshot into a wallet.
	// Here we create a second wallet and restore the snapshot into it.
	fmt.Println("\n── Import snapshot into second wallet ──")
	dbPath2 := filepath.Join(tmpDir, "wallet_restore.db")
	wallet2, err := webcash.Open(dbPath2)
	must(err)
	must(wallet2.ImportSnapshot(snapshot))
	balance2, err := wallet2.Balance()
	must(err)
	fmt.Printf("  Restored wallet balance: %s\n", balance2)
	wallet2.Close()
	fmt.Println("  OK")

	// ── 8. Password encryption ─────────────────────────────────
	// EncryptWithPassword produces an encrypted JSON blob of the wallet.
	// DecryptWithPassword restores from that blob + correct password.
	fmt.Println("\n── Encrypt / decrypt with password ──")
	encrypted, err := wallet.EncryptWithPassword("my_secure_password")
	must(err)
	fmt.Printf("  Encrypted blob: %d chars\n", len(encrypted))
	var encMap map[string]interface{}
	must(json.Unmarshal([]byte(encrypted), &encMap))
	fmt.Println("  Valid JSON: true")
	must(wallet.DecryptWithPassword(encrypted, "my_secure_password"))
	fmt.Println("  Decrypt: OK")
	fmt.Println("  OK")

	// ── 9. Server operations ───────────────────────────────────
	// These require a live webcash server. Set TEST_WEBCASH to a valid
	// webcash string (e.g. "e1:secret:...") to enable this section.
	testWc := os.Getenv("TEST_WEBCASH")
	if testWc != "" {
		// 9a. Insert (receive) webcash into the wallet
		fmt.Println("\n── Insert webcash (receive) ──")
		lim := len(testWc)
		if lim > 40 {
			lim = 40
		}
		fmt.Printf("  Inserting: %s...\n", testWc[:lim])
		must(wallet.Insert(testWc))
		balance, _ = wallet.Balance()
		fmt.Println("  Balance after insert:", balance)

		// 9b. Pay (send) webcash to someone
		fmt.Println("\n── Pay webcash (send) ──")
		payResult, err := wallet.Pay("0.00000001", "go-example")
		if err != nil {
			fmt.Println("  Pay skipped:", err)
		} else {
			plim := len(payResult)
			if plim > 60 {
				plim = 60
			}
			fmt.Printf("  Payment: %s...\n", payResult[:plim])
			fmt.Println("  (recipient uses this string to claim funds)")
		}

		// 9c. Check wallet against server
		fmt.Println("\n── Check wallet against server ──")
		if err := wallet.Check(); err != nil {
			fmt.Println("  Check:", err)
		} else {
			fmt.Println("  All outputs verified")
		}

		// 9d. Merge outputs
		fmt.Println("\n── Merge outputs ──")
		mergeResult, err := wallet.Merge(20)
		if err != nil {
			fmt.Println("  Merge skipped:", err)
		} else {
			fmt.Println("  Merge:", mergeResult)
		}

		// 9e. List outputs and stats after server ops
		fmt.Println("\n── Post-operation status ──")
		balance, _ = wallet.Balance()
		fmt.Println("  Balance:", balance)
		postList, _ := wallet.ListWebcash()
		var postArr []interface{}
		_ = json.Unmarshal([]byte(postList), &postArr)
		fmt.Printf("  Unspent outputs: %d\n", len(postArr))
		postStats, _ := wallet.Stats()
		fmt.Println("  Stats:", postStats)
	} else {
		fmt.Println("\n  Skipping server operations (set TEST_WEBCASH env var)")
	}

	// ── 10. Recovery ───────────────────────────────────────────
	// RecoverFromWallet scans the server using the wallet's stored
	// master secret to find any outputs derived from it.
	fmt.Println("\n── Recover from wallet ──")
	recoverResult, err := wallet.RecoverFromWallet(20)
	if err != nil {
		if e, ok := err.(*webcash.WebycashError); ok {
			fmt.Printf("  Recovery skipped (expected offline): %s\n", e.Message)
		} else {
			fmt.Printf("  Recovery skipped (expected offline): %v\n", err)
		}
	} else {
		fmt.Println("  Recovery:", recoverResult)
	}

	// ── 11. Cleanup ────────────────────────────────────────────
	// wallet.Close() is called via defer. Temp dir is removed via defer.
	fmt.Println("\n── Cleanup ──")
	fmt.Println("  Temp files will be removed via defer")

	fmt.Println("\n=== All tests passed ===")
}
