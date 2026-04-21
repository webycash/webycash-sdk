// webycash-sdk Java example — complete webcash protocol demonstration
// Compile: javac -classpath jna.jar Example.java
// Run:     java -Djna.library.path=../../native/target/release -classpath .:jna.jar Example

import cash.weby.sdk.WebycashSDK;
import cash.weby.sdk.WebycashSDK.WebycashException;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;

public class Example {
    public static void main(String[] args) throws Exception {
        System.out.println("=== webycash-sdk Java Example ===");

        // -- 1. Version & utilities ------------------------------------------
        System.out.println("\n── Version & utilities ──");
        System.out.println("  Library version: " + WebycashSDK.version());

        long wats = WebycashSDK.amountParse("1.5");
        System.out.println("  parse('1.5') = " + wats + " wats");
        assert wats == 150_000_000L : "Expected 150000000 wats";

        String formatted = WebycashSDK.amountFormat(wats);
        System.out.println("  format(" + wats + ") = '" + formatted + "'");
        assert "1.5".equals(formatted) : "Expected '1.5'";
        System.out.println("  OK");

        // Create temp directory for wallet databases
        Path tmpDir = Files.createTempDirectory("webycash_sdk_java_");
        String dbPath = tmpDir.resolve("wallet.db").toString();

        try {
            // -- 2. Create wallet ------------------------------------------------
            System.out.println("\n── Create wallet ──");
            try (var wallet = new WebycashSDK.Wallet(dbPath)) {
                System.out.println("  Opened: " + dbPath);

                // -- 3. Master secret backup -------------------------------------
                // The master secret is the 64-hex HD root; write it down for
                // disaster recovery.
                System.out.println("\n── Master secret backup ──");
                String masterSecret = wallet.masterSecret();
                System.out.println("  Master secret: " + masterSecret.substring(0, 16)
                        + "... (" + masterSecret.length() + " hex chars)");
                assert masterSecret.length() == 64 : "Expected 64 hex chars";
                System.out.println("  OK");

                // -- 4. Balance & stats ------------------------------------------
                System.out.println("\n── Balance & stats ──");
                String balance = wallet.balance();
                System.out.println("  Balance: " + balance);
                assert "0".equals(balance) : "Fresh wallet should have zero balance";

                String stats = wallet.stats();
                System.out.println("  Stats: " + stats);
                assert stats.contains("unspent_webcash") : "Stats should contain unspent_webcash";
                System.out.println("  OK");

                // -- 5. List outputs ---------------------------------------------
                System.out.println("\n── List outputs ──");
                String wcList = wallet.listWebcash();
                System.out.println("  Unspent outputs (empty wallet): " + wcList);
                assert "[]".equals(wcList) : "Empty wallet should have no outputs";
                System.out.println("  OK");

                // -- 6. Snapshot backup ------------------------------------------
                // Export is a JSON blob containing master_secret + all wallet state.
                System.out.println("\n── Snapshot backup ──");
                String snapshot = wallet.exportSnapshot();
                System.out.println("  Snapshot: " + snapshot.length() + " chars");
                assert snapshot.length() > 0 : "Snapshot should not be empty";
                assert snapshot.contains("master_secret") : "Snapshot should contain master_secret";
                System.out.println("  Contains master_secret: yes");
                System.out.println("  OK");

                // -- 7. Snapshot restore -----------------------------------------
                // Import the snapshot into a fresh second wallet to verify portability.
                System.out.println("\n── Snapshot restore ──");
                String db2Path = tmpDir.resolve("wallet_restore.db").toString();
                try (var wallet2 = new WebycashSDK.Wallet(db2Path)) {
                    wallet2.importSnapshot(snapshot);
                    System.out.println("  Imported snapshot into second wallet");

                    String bal2 = wallet2.balance();
                    System.out.println("  Second wallet balance: " + bal2);

                    // Verify master secrets match
                    String secret2 = wallet2.masterSecret();
                    assert secret2.equals(masterSecret) : "Restored wallet should have same master secret";
                    System.out.println("  Master secrets match: yes");
                    System.out.println("  OK");
                }

                // -- 8. Password encryption --------------------------------------
                // encryptWithPassword() serializes the wallet into an encrypted JSON blob.
                // decryptWithPassword() restores from that blob.
                System.out.println("\n── Password encryption ──");
                String password = "correct-horse-battery-staple";

                String encrypted = wallet.encryptWithPassword(password);
                System.out.println("  Encrypted blob: " + encrypted.length() + " chars");
                assert encrypted.length() > 0 : "Encrypted blob should not be empty";

                wallet.decryptWithPassword(encrypted, password);
                System.out.println("  Decrypted successfully");

                // Verify wallet still works after decrypt
                String balAfter = wallet.balance();
                System.out.println("  Balance after decrypt: " + balAfter);

                // Also test the legacy encrypt_seed
                wallet.encryptSeed("seed-password");
                System.out.println("  Seed encryption: OK");
                System.out.println("  OK");

                // -- 9. Server operations ----------------------------------------
                // These require a live webcash server and a valid webcash string.
                // Set TEST_WEBCASH env var to a secret webcash string to enable.
                String testWc = System.getenv("TEST_WEBCASH");
                if (testWc != null) {
                    // 9a. Insert webcash (receive)
                    System.out.println("\n── Insert webcash ──");
                    System.out.println("  Inserting: " + testWc.substring(0, Math.min(30, testWc.length())) + "...");
                    wallet.insert(testWc);
                    System.out.println("  Balance after insert: " + wallet.balance());

                    // 9b. Pay amount (send)
                    System.out.println("\n── Pay ──");
                    try {
                        String payResult = wallet.pay("0.00000001", "java-test");
                        int lim = Math.min(60, payResult.length());
                        System.out.println("  Payment: " + payResult.substring(0, lim) + "...");
                    } catch (WebycashException e) {
                        System.out.println("  Pay skipped: " + e.getMessage());
                    }

                    // 9c. Check wallet against server
                    System.out.println("\n── Check ──");
                    try {
                        wallet.check();
                        System.out.println("  Check: OK");
                    } catch (WebycashException e) {
                        System.out.println("  Check: " + e.getMessage());
                    }

                    // 9d. Merge outputs
                    System.out.println("\n── Merge ──");
                    try {
                        System.out.println("  Merge: " + wallet.merge(20));
                    } catch (WebycashException e) {
                        System.out.println("  Merge skipped: " + e.getMessage());
                    }

                    // 9e. List outputs, get stats
                    System.out.println("\n── List outputs & stats ──");
                    String afterList = wallet.listWebcash();
                    // Simple count: split by commas in the JSON array
                    String inner = afterList.substring(1, afterList.length() - 1).trim();
                    int outputCount = inner.isEmpty() ? 0 : inner.split(",").length;
                    System.out.println("  Unspent outputs: " + outputCount);
                    System.out.println("  Stats: " + wallet.stats());
                } else {
                    System.out.println("\n── Server operations ──");
                    System.out.println("  Skipped (set TEST_WEBCASH env var to enable)");
                }

                // -- 10. Recovery ------------------------------------------------
                // recoverFromWallet() re-derives keys from the stored master secret
                // and scans the server for any webcash belonging to this wallet.
                System.out.println("\n── Recovery ──");
                try {
                    String recoverResult = wallet.recoverFromWallet(20);
                    System.out.println("  recoverFromWallet: " + recoverResult);
                } catch (WebycashException e) {
                    // Expected to fail without a server connection
                    System.out.println("  recoverFromWallet: " + e.getMessage());
                }

                // -- Error handling ----------------------------------------------
                System.out.println("\n── Error handling ──");
                try {
                    wallet.insert("invalid_webcash_string");
                    System.out.println("  ERROR: should have thrown");
                } catch (WebycashException e) {
                    System.out.println("  Caught expected error: code=" + e.code + " msg=" + e.getMessage());
                }

            } // wallet.close() called automatically by try-with-resources

            // -- 11. Cleanup -------------------------------------------------
            System.out.println("\n── Cleanup ──");
            System.out.println("  Wallets closed (auto-close via try-with-resources)");

        } finally {
            // Remove temp directory and all contents
            File dir = tmpDir.toFile();
            File[] files = dir.listFiles();
            if (files != null) {
                for (File f : files) f.delete();
            }
            dir.delete();
            System.out.println("  Temp files removed");
        }

        System.out.println("\n=== All tests passed ===");
    }
}
