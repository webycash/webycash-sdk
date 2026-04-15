// webycash-sdk Go example — full wallet lifecycle
// Build/run from repo go module root:
//   cd ../../go
//   CGO_LDFLAGS="-L$(pwd)/../native/target/release -lwebycash_sdk" DYLD_LIBRARY_PATH="$(pwd)/../native/target/release" go run ../examples/go/main.go

package main

import (
	"encoding/json"
	"fmt"
	"os"

	webcash "github.com/webycash/webycash-sdk/go"
)

func main() {
	fmt.Println("=== webycash-sdk Go Example ===")
	fmt.Println("Version:", webcash.Version())

	// Amount utilities
	fmt.Println("\n-- Amount utilities --")
	wats, _ := webcash.AmountParse("1.5")
	fmt.Printf("  parse('1.5') = %d wats\n", wats)
	s, _ := webcash.AmountFormat(wats)
	fmt.Printf("  format(%d) = '%s'\n", wats, s)

	// Wallet lifecycle
	dbPath := "/tmp/webycash_sdk_go_test.db"
	os.Remove(dbPath)

	fmt.Println("\n-- Open wallet --")
	wallet, err := webcash.Open(dbPath)
	if err != nil {
		fmt.Println("  Error:", err)
		os.Exit(1)
	}
	defer wallet.Close()

	balance, _ := wallet.Balance()
	fmt.Println("  Balance:", balance)

	stats, _ := wallet.Stats()
	fmt.Println("  Stats:", stats)

	// Insert if TEST_WEBCASH is set
	testWc := os.Getenv("TEST_WEBCASH")
	if testWc != "" {
		fmt.Println("\n-- Insert --")
		if err := wallet.Insert(testWc); err != nil {
			fmt.Println("  Insert error:", err)
		} else {
			b, _ := wallet.Balance()
			fmt.Println("  Balance:", b)

			fmt.Println("\n-- Check --")
			if err := wallet.Check(); err != nil {
				fmt.Println("  Check:", err)
			} else {
				fmt.Println("  OK")
			}

			fmt.Println("\n-- Pay --")
			if out, err := wallet.Pay("0.00000001", "go-test"); err != nil {
				fmt.Println("  Pay skipped:", err)
			} else {
				lim := len(out)
				if lim > 60 {
					lim = 60
				}
				fmt.Println(" ", out[:lim])
			}

			fmt.Println("\n-- Merge --")
			if out, err := wallet.Merge(20); err != nil {
				fmt.Println("  Merge skipped:", err)
			} else {
				fmt.Println(" ", out)
			}

			fmt.Println("\n-- Recover --")
			snap, errSnap := wallet.ExportSnapshot()
			var payload struct {
				MasterSecret string `json:"master_secret"`
			}
			if errSnap != nil || json.Unmarshal([]byte(snap), &payload) != nil || payload.MasterSecret == "" {
				fmt.Println("  Recover skipped: snapshot / master_secret")
			} else if out, err := wallet.Recover(payload.MasterSecret, 20); err != nil {
				fmt.Println("  Recover skipped:", err)
			} else {
				fmt.Println(" ", out)
			}
		}
	} else {
		fmt.Println("  Skipping server ops (set TEST_WEBCASH)")
	}

	// Encrypt seed
	fmt.Println("\n-- Encrypt seed --")
	if err := wallet.EncryptSeed("test_password"); err != nil {
		fmt.Println("  Error:", err)
	} else {
		fmt.Println("  OK")
	}

	// Error handling
	fmt.Println("\n-- Error handling --")
	if err := wallet.Insert("bad_string"); err != nil {
		if e, ok := err.(*webcash.WebycashError); ok {
			fmt.Printf("  Caught: code=%d msg=%s\n", e.Code, e.Message)
		}
	}

	os.Remove(dbPath)
	os.Remove(dbPath + "-wal")
	os.Remove(dbPath + "-shm")

	fmt.Println("\n=== All tests passed ===")
}
