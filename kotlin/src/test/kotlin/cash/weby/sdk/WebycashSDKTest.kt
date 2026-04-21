package cash.weby.sdk

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import kotlin.io.path.createTempDirectory
import kotlin.io.path.deleteIfExists
import kotlin.io.path.Path

class WebycashSDKTest {

    private fun tmpWalletPath(): java.nio.file.Path {
        val dir = createTempDirectory("webycash-test-")
        return dir.resolve("wallet.db")
    }

    // 1. test_version
    @Test
    fun versionNotEmpty() {
        assertTrue(version().isNotEmpty())
    }

    // 2. test_amount_roundtrip
    @Test
    fun amountRoundtrip() {
        assertEquals(150_000_000L, amountParse("1.5"))
        assertEquals("1.5", amountFormat(150_000_000L))
        assertEquals(1L, amountParse("0.00000001"))
        assertEquals("0.00000001", amountFormat(1L))
    }

    // 3. test_wallet_open_balance_close
    @Test
    fun walletOpenBalanceClose() {
        val db = tmpWalletPath()
        Wallet.open(db.toString()).use { w ->
            val bal = w.balance()
            assertTrue(bal == "0" || bal == "0.00000000", "expected zero balance, got \"$bal\"")
        }
        db.deleteIfExists()
    }

    // 4. test_export_import_snapshot
    @Test
    fun exportImportSnapshot() {
        val db1 = tmpWalletPath()
        val db2 = tmpWalletPath()
        try {
            val snapshot: String
            Wallet.open(db1.toString()).use { w1 ->
                snapshot = w1.exportSnapshot()
                assertTrue(snapshot.isNotEmpty())
            }
            Wallet.open(db2.toString()).use { w2 ->
                w2.importSnapshot(snapshot)
                val snap2 = w2.exportSnapshot()
                // Both snapshots should contain master_secret and be valid JSON
                assertTrue(snapshot.contains("master_secret"), "original snapshot missing master_secret")
                assertTrue(snap2.contains("master_secret"), "re-exported snapshot missing master_secret")
                assertTrue(snap2.contains("{") && snap2.contains("}"), "re-exported snapshot not valid JSON")
                val bal = w2.balance()
                assertTrue(bal == "0" || bal == "0.00000000", "expected zero balance after import, got \"$bal\"")
            }
        } finally {
            db1.deleteIfExists()
            db2.deleteIfExists()
        }
    }

    // 5. test_list_webcash_empty
    @Test
    fun listWebcashEmpty() {
        val db = tmpWalletPath()
        try {
            Wallet.open(db.toString()).use { w ->
                assertEquals("[]", w.listWebcash())
            }
        } finally {
            db.deleteIfExists()
        }
    }

    // 6. test_master_secret_format
    @Test
    fun masterSecretFormat() {
        val db = tmpWalletPath()
        try {
            Wallet.open(db.toString()).use { w ->
                val secret = w.masterSecret()
                assertEquals(64, secret.length)
                assertTrue(secret.all { it in '0'..'9' || it in 'a'..'f' })
            }
        } finally {
            db.deleteIfExists()
        }
    }

    // 7. test_master_secret_deterministic
    @Test
    fun masterSecretDeterministic() {
        val seed = ByteArray(32) { 0x42 }
        val db1 = tmpWalletPath()
        val db2 = tmpWalletPath()
        try {
            val secret1: String
            Wallet.openWithSeed(db1.toString(), seed).use { w1 ->
                secret1 = w1.masterSecret()
            }
            val secret2: String
            Wallet.openWithSeed(db2.toString(), seed).use { w2 ->
                secret2 = w2.masterSecret()
            }
            assertEquals(secret1, secret2)
            assertEquals(64, secret1.length)
        } finally {
            db1.deleteIfExists()
            db2.deleteIfExists()
        }
    }

    // 8. test_encrypt_decrypt_password
    @Test
    fun encryptDecryptPassword() {
        val db = tmpWalletPath()
        try {
            Wallet.open(db.toString()).use { w ->
                val secretBefore = w.masterSecret()
                val encrypted = w.encryptWithPassword("hunter2")
                assertFalse(encrypted.isEmpty())

                w.decryptWithPassword(encrypted, "hunter2")
                val secretAfter = w.masterSecret()
                assertEquals(secretBefore, secretAfter)
            }
        } finally {
            db.deleteIfExists()
        }
    }

    // 9. test_recover_from_wallet_empty
    @Test
    fun recoverFromWalletEmpty() {
        val db = tmpWalletPath()
        try {
            Wallet.open(db.toString()).use { w ->
                try {
                    val result = w.recoverFromWallet(5)
                    assertTrue(result.isNotEmpty())
                } catch (e: WebycashException) {
                    // Network errors are acceptable in offline tests
                    val msg = e.message ?: ""
                    assertTrue(
                        msg.contains("network", ignoreCase = true) ||
                        msg.contains("connection", ignoreCase = true) ||
                        msg.contains("resolve", ignoreCase = true) ||
                        msg.contains("DNS", ignoreCase = true) ||
                        msg.contains("http", ignoreCase = true) ||
                        msg.contains("request", ignoreCase = true),
                        "unexpected non-network error: $msg"
                    )
                }
            }
        } finally {
            db.deleteIfExists()
        }
    }

    // 10. test_import_invalid_json
    @Test
    fun importInvalidJson() {
        val db = tmpWalletPath()
        try {
            Wallet.open(db.toString()).use { w ->
                assertThrows(WebycashException::class.java) {
                    w.importSnapshot("not valid json")
                }
            }
        } finally {
            db.deleteIfExists()
        }
    }
}
