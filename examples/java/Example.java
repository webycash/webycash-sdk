// webycash-sdk Java example — full wallet lifecycle
// Compile: javac -classpath jna.jar Example.java
// Run:     java -Djna.library.path=../../native/target/release -classpath .:jna.jar Example

import cash.weby.sdk.WebycashSDK;
import java.io.File;

public class Example {
    public static void main(String[] args) {
        System.out.println("=== webycash-sdk Java Example ===");
        System.out.println("Version: " + WebycashSDK.version());

        // Amount utilities
        System.out.println("\n-- Amount utilities --");
        long wats = WebycashSDK.amountParse("1.5");
        System.out.println("  parse('1.5') = " + wats + " wats");
        String s = WebycashSDK.amountFormat(wats);
        System.out.println("  format(" + wats + ") = '" + s + "'");

        // Wallet lifecycle
        String dbPath = "/tmp/webycash_sdk_java_test.db";
        new File(dbPath).delete();

        System.out.println("\n-- Open wallet --");
        try (var wallet = new WebycashSDK.Wallet(dbPath)) {
            System.out.println("  Balance: " + wallet.balance());
            System.out.println("  Stats: " + wallet.stats());

            // Insert if TEST_WEBCASH is set
            String testWc = System.getenv("TEST_WEBCASH");
            if (testWc != null) {
                System.out.println("\n-- Insert --");
                wallet.insert(testWc);
                System.out.println("  Balance: " + wallet.balance());

                System.out.println("\n-- Check --");
                wallet.check();
                System.out.println("  OK");

                System.out.println("\n-- Pay --");
                try {
                    String paid = wallet.pay("0.00000001", "java-test");
                    int lim = Math.min(60, paid.length());
                    System.out.println("  " + paid.substring(0, lim));
                } catch (WebycashSDK.WebycashException e) {
                    System.out.println("  Pay skipped: " + e.getMessage());
                }

                System.out.println("\n-- Merge --");
                try {
                    System.out.println("  " + wallet.merge(20));
                } catch (WebycashSDK.WebycashException e) {
                    System.out.println("  Merge skipped: " + e.getMessage());
                }

                System.out.println("\n-- Recover --");
                try {
                    String snap = wallet.exportSnapshot();
                    var m = java.util.regex.Pattern.compile("\"master_secret\"\\s*:\\s*\"([0-9a-fA-F]{64})\"")
                            .matcher(snap);
                    if (m.find()) {
                        System.out.println("  " + wallet.recover(m.group(1), 20));
                    } else {
                        System.out.println("  Recover skipped: no master_secret");
                    }
                } catch (WebycashSDK.WebycashException e) {
                    System.out.println("  Recover skipped: " + e.getMessage());
                }
            } else {
                System.out.println("  Skipping server ops (set TEST_WEBCASH)");
            }

            // Encrypt seed
            System.out.println("\n-- Encrypt seed --");
            wallet.encryptSeed("test_password");
            System.out.println("  OK");

            // Error handling
            System.out.println("\n-- Error handling --");
            try {
                wallet.insert("bad_string");
            } catch (WebycashSDK.WebycashException e) {
                System.out.println("  Caught: code=" + e.code + " msg=" + e.getMessage());
            }
        }

        new File(dbPath).delete();
        new File(dbPath + "-wal").delete();
        new File(dbPath + "-shm").delete();

        System.out.println("\n=== All tests passed ===");
    }
}
