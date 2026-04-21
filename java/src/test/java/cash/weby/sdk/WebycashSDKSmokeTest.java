package cash.weby.sdk;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

public class WebycashSDKSmokeTest {

    private static Path tmpWalletPath() throws IOException {
        Path dir = Files.createTempDirectory("webycash-test-");
        return dir.resolve("wallet.db");
    }

    // 1. test_version
    @Test
    void versionNotEmpty() {
        assertFalse(WebycashSDK.version().isEmpty());
    }

    // 2. test_amount_roundtrip
    @Test
    void amountRoundtrip() {
        assertEquals(150_000_000L, WebycashSDK.amountParse("1.5"));
        assertEquals("1.5", WebycashSDK.amountFormat(150_000_000L));
        assertEquals(1L, WebycashSDK.amountParse("0.00000001"));
        assertEquals("0.00000001", WebycashSDK.amountFormat(1L));
    }

    // 3. test_wallet_open_balance_close
    @Test
    void walletOpenBalanceClose() throws Exception {
        Path db = tmpWalletPath();
        try (WebycashSDK.Wallet w = new WebycashSDK.Wallet(db.toString())) {
            String bal = w.balance();
            assertTrue(bal.equals("0") || bal.equals("0.00000000"),
                       "expected zero balance, got \"" + bal + "\"");
        } finally {
            Files.deleteIfExists(db);
        }
    }

    // 4. test_export_import_snapshot
    @Test
    void exportImportSnapshot() throws Exception {
        Path db1 = tmpWalletPath();
        Path db2 = tmpWalletPath();
        try {
            String snapshot;
            try (WebycashSDK.Wallet w1 = new WebycashSDK.Wallet(db1.toString())) {
                snapshot = w1.exportSnapshot();
                assertFalse(snapshot.isEmpty());
            }
            try (WebycashSDK.Wallet w2 = new WebycashSDK.Wallet(db2.toString())) {
                w2.importSnapshot(snapshot);
                String snap2 = w2.exportSnapshot();
                // Both snapshots should contain master_secret and be valid JSON
                assertTrue(snapshot.contains("master_secret"), "original snapshot missing master_secret");
                assertTrue(snap2.contains("master_secret"), "re-exported snapshot missing master_secret");
                assertTrue(snap2.contains("{") && snap2.contains("}"), "re-exported snapshot not valid JSON");
                String bal = w2.balance();
                assertTrue(bal.equals("0") || bal.equals("0.00000000"),
                           "expected zero balance after import, got \"" + bal + "\"");
            }
        } finally {
            Files.deleteIfExists(db1);
            Files.deleteIfExists(db2);
        }
    }

    // 5. test_list_webcash_empty
    @Test
    void listWebcashEmpty() throws Exception {
        Path db = tmpWalletPath();
        try (WebycashSDK.Wallet w = new WebycashSDK.Wallet(db.toString())) {
            assertEquals("[]", w.listWebcash());
        } finally {
            Files.deleteIfExists(db);
        }
    }

    // 6. test_master_secret_format
    @Test
    void masterSecretFormat() throws Exception {
        Path db = tmpWalletPath();
        try (WebycashSDK.Wallet w = new WebycashSDK.Wallet(db.toString())) {
            String secret = w.masterSecret();
            assertEquals(64, secret.length());
            assertTrue(secret.matches("[0-9a-f]{64}"));
        } finally {
            Files.deleteIfExists(db);
        }
    }

    // 7. test_master_secret_deterministic
    @Test
    void masterSecretDeterministic() throws Exception {
        byte[] seed = new byte[32];
        java.util.Arrays.fill(seed, (byte) 0x42);

        Path db1 = tmpWalletPath();
        Path db2 = tmpWalletPath();
        try {
            String secret1;
            try (WebycashSDK.Wallet w1 = new WebycashSDK.Wallet(db1.toString(), seed)) {
                secret1 = w1.masterSecret();
            }
            String secret2;
            try (WebycashSDK.Wallet w2 = new WebycashSDK.Wallet(db2.toString(), seed)) {
                secret2 = w2.masterSecret();
            }
            assertEquals(secret1, secret2);
            assertEquals(64, secret1.length());
        } finally {
            Files.deleteIfExists(db1);
            Files.deleteIfExists(db2);
        }
    }

    // 8. test_encrypt_decrypt_password
    @Test
    void encryptDecryptPassword() throws Exception {
        Path db = tmpWalletPath();
        try (WebycashSDK.Wallet w = new WebycashSDK.Wallet(db.toString())) {
            String secretBefore = w.masterSecret();
            String encrypted = w.encryptWithPassword("hunter2");
            assertFalse(encrypted.isEmpty());

            w.decryptWithPassword(encrypted, "hunter2");
            String secretAfter = w.masterSecret();
            assertEquals(secretBefore, secretAfter);
        } finally {
            Files.deleteIfExists(db);
        }
    }

    // 9. test_recover_from_wallet_empty
    @Test
    void recoverFromWalletEmpty() throws Exception {
        Path db = tmpWalletPath();
        try (WebycashSDK.Wallet w = new WebycashSDK.Wallet(db.toString())) {
            try {
                String result = w.recoverFromWallet(5);
                assertFalse(result.isEmpty());
            } catch (WebycashSDK.WebycashException e) {
                // Network errors are acceptable in offline tests
                String msg = e.getMessage().toLowerCase();
                assertTrue(
                    msg.contains("network") || msg.contains("connection") ||
                    msg.contains("resolve") || msg.contains("dns") ||
                    msg.contains("http") || msg.contains("request"),
                    "unexpected non-network error: " + e.getMessage()
                );
            }
        } finally {
            Files.deleteIfExists(db);
        }
    }

    // 10. test_import_invalid_json
    @Test
    void importInvalidJson() throws Exception {
        Path db = tmpWalletPath();
        try (WebycashSDK.Wallet w = new WebycashSDK.Wallet(db.toString())) {
            assertThrows(WebycashSDK.WebycashException.class, () -> {
                w.importSnapshot("not valid json");
            });
        } finally {
            Files.deleteIfExists(db);
        }
    }
}
