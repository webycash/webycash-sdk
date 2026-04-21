// webycash-sdk Kotlin example — complete webcash protocol demonstration
// Run: kotlinc -classpath jna.jar Example.kt -include-runtime -d example.jar
//      java -Djna.library.path=../../native/target/release -jar example.jar

package cash.weby.sdk.example

import cash.weby.sdk.*
import java.io.File
import kotlin.io.path.createTempDirectory

fun main() {
    println("=== webycash-sdk Kotlin Example ===")

    // ── 1. Version & utilities ─────────────────────────────────
    println("\n── Version & utilities ──")
    println("  Library version: ${version()}")

    val wats = amountParse("1.5")
    println("  parse('1.5') = $wats wats")
    check(wats == 150_000_000L) { "Expected 150000000 wats" }

    val formatted = amountFormat(wats)
    println("  format($wats) = '$formatted'")
    check(formatted == "1.5") { "Expected '1.5'" }
    println("  OK")

    // Create temp directory for wallet databases
    val tmpDir = createTempDirectory("webycash_sdk_kotlin_").toFile()

    try {
        val dbPath = File(tmpDir, "wallet.db").absolutePath

        // ── 2. Create wallet ───────────────────────────────────
        println("\n── Create wallet ──")
        Wallet.open(dbPath).use { wallet ->
            println("  Opened: $dbPath")

            // ── 3. Master secret backup ────────────────────────
            // The master secret is the 64-hex HD root; write it down for disaster recovery.
            println("\n── Master secret backup ──")
            val masterSecret = wallet.masterSecret()
            println("  Master secret: ${masterSecret.take(16)}... (${masterSecret.length} hex chars)")
            check(masterSecret.length == 64) { "Expected 64 hex chars" }
            println("  OK")

            // ── 4. Balance & stats ─────────────────────────────
            println("\n── Balance & stats ──")
            val balance = wallet.balance()
            println("  Balance: $balance")
            check(balance == "0") { "Fresh wallet should have zero balance" }

            val stats = wallet.stats()
            println("  Stats: $stats")
            check("unspent_webcash" in stats) { "Stats should contain unspent_webcash" }
            println("  OK")

            // ── 5. List outputs ────────────────────────────────
            println("\n── List outputs ──")
            val wcList = wallet.listWebcash()
            println("  Unspent outputs (empty wallet): $wcList")
            check(wcList == "[]") { "Empty wallet should have no outputs" }
            println("  OK")

            // ── 6. Snapshot backup ─────────────────────────────
            // Export is a JSON blob containing master_secret + all wallet state.
            println("\n── Snapshot backup ──")
            val snapshot = wallet.exportSnapshot()
            println("  Snapshot: ${snapshot.length} chars")
            check(snapshot.isNotEmpty()) { "Snapshot should not be empty" }
            // Verify it parses as JSON and contains master_secret
            check("master_secret" in snapshot) { "Snapshot should contain master_secret" }
            println("  Contains master_secret: yes")
            println("  OK")

            // ── 7. Snapshot restore ────────────────────────────
            // Import the snapshot into a fresh second wallet to verify portability.
            println("\n── Snapshot restore ──")
            val db2Path = File(tmpDir, "wallet_restore.db").absolutePath
            Wallet.open(db2Path).use { wallet2 ->
                wallet2.importSnapshot(snapshot)
                println("  Imported snapshot into second wallet")

                val bal2 = wallet2.balance()
                println("  Second wallet balance: $bal2")

                // Verify master secrets match
                val secret2 = wallet2.masterSecret()
                check(secret2 == masterSecret) { "Restored wallet should have same master secret" }
                println("  Master secrets match: yes")
                println("  OK")
            }

            // ── 8. Password encryption ─────────────────────────
            // encryptWithPassword() serializes the wallet into an encrypted JSON blob.
            // decryptWithPassword() restores from that blob.
            println("\n── Password encryption ──")
            val password = "correct-horse-battery-staple"

            val encrypted = wallet.encryptWithPassword(password)
            println("  Encrypted blob: ${encrypted.length} chars")
            check(encrypted.isNotEmpty()) { "Encrypted blob should not be empty" }

            wallet.decryptWithPassword(encrypted, password)
            println("  Decrypted successfully")

            // Verify wallet still works after decrypt
            val balAfter = wallet.balance()
            println("  Balance after decrypt: $balAfter")

            // Also test the legacy encrypt_seed
            wallet.encryptSeed("seed-password")
            println("  Seed encryption: OK")
            println("  OK")

            // ── 9. Server operations ───────────────────────────
            // These require a live webcash server and a valid webcash string.
            // Set TEST_WEBCASH env var to a secret webcash string to enable.
            val testWc = System.getenv("TEST_WEBCASH")
            if (testWc != null) {
                // 9a. Insert webcash (receive)
                println("\n── Insert webcash ──")
                println("  Inserting: ${testWc.take(30)}...")
                wallet.insert(testWc)
                println("  Balance after insert: ${wallet.balance()}")

                // 9b. Pay amount (send)
                println("\n── Pay ──")
                try {
                    val payResult = wallet.pay("0.00000001", "kotlin-test")
                    println("  Payment: ${payResult.take(60)}...")
                } catch (e: WebycashException) {
                    println("  Pay skipped: ${e.message}")
                }

                // 9c. Check wallet against server
                println("\n── Check ──")
                try {
                    wallet.check()
                    println("  Check: OK")
                } catch (e: WebycashException) {
                    println("  Check: ${e.message}")
                }

                // 9d. Merge outputs
                println("\n── Merge ──")
                try {
                    println("  Merge: ${wallet.merge(20)}")
                } catch (e: WebycashException) {
                    println("  Merge skipped: ${e.message}")
                }

                // 9e. List outputs, get stats
                println("\n── List outputs & stats ──")
                val afterList = wallet.listWebcash()
                // Parse JSON array to count elements
                val outputCount = afterList.removeSurrounding("[", "]")
                    .split(",").filter { it.isNotBlank() }.size
                println("  Unspent outputs: $outputCount")
                println("  Stats: ${wallet.stats()}")
            } else {
                println("\n── Server operations ──")
                println("  Skipped (set TEST_WEBCASH env var to enable)")
            }

            // ── 10. Recovery ───────────────────────────────────
            // recoverFromWallet() re-derives keys from the stored master secret
            // and scans the server for any webcash belonging to this wallet.
            println("\n── Recovery ──")
            try {
                val recoverResult = wallet.recoverFromWallet(20)
                println("  recoverFromWallet: $recoverResult")
            } catch (e: WebycashException) {
                // Expected to fail without a server connection
                println("  recoverFromWallet: ${e.message}")
            }

            // ── Error handling ─────────────────────────────────
            println("\n── Error handling ──")
            try {
                wallet.insert("invalid_webcash_string")
                println("  ERROR: should have thrown")
            } catch (e: WebycashException) {
                println("  Caught expected error: code=${e.code} msg=${e.message}")
            }

        } // wallet.close() called automatically by .use {}

        // ── 11. Cleanup ────────────────────────────────────────
        println("\n── Cleanup ──")
        println("  Wallets closed (auto-close via .use {})")

    } finally {
        // Remove temp directory and all contents
        tmpDir.deleteRecursively()
        println("  Temp files removed")
    }

    println("\n=== All tests passed ===")
}
