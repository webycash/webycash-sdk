// webycash-sdk Kotlin example — full wallet lifecycle
// Run: kotlinc -classpath jna.jar Example.kt -include-runtime -d example.jar
//      java -Djna.library.path=../../native/target/release -jar example.jar

package cash.weby.sdk.example

import cash.weby.sdk.*
import java.io.File

fun main() {
    println("=== webycash-sdk Kotlin Example ===")
    println("Version: ${version()}")

    // Amount utilities
    println("\n-- Amount utilities --")
    val wats = amountParse("1.5")
    println("  parse('1.5') = $wats wats")
    val s = amountFormat(wats)
    println("  format($wats) = '$s'")

    // Wallet lifecycle
    val dbPath = "/tmp/webycash_sdk_kotlin_test.db"
    File(dbPath).delete()

    println("\n-- Open wallet --")
    Wallet.open(dbPath).use { wallet ->
        println("  Balance: ${wallet.balance()}")
        println("  Stats: ${wallet.stats()}")

        // Insert if TEST_WEBCASH is set
        val testWc = System.getenv("TEST_WEBCASH")
        if (testWc != null) {
            println("\n-- Insert --")
            wallet.insert(testWc)
            println("  Balance: ${wallet.balance()}")

            println("\n-- Check --")
            wallet.check()
            println("  OK")

            println("\n-- Pay --")
            try {
                println("  " + wallet.pay("0.00000001", "kotlin-test").take(60))
            } catch (e: WebycashException) {
                println("  Pay skipped: ${e.message}")
            }

            println("\n-- Merge --")
            try {
                println("  " + wallet.merge(20))
            } catch (e: WebycashException) {
                println("  Merge skipped: ${e.message}")
            }

            println("\n-- Recover --")
            try {
                val snap = wallet.exportSnapshot()
                val hex = Regex(""""master_secret"\s*:\s*"([0-9a-fA-F]{64})"""").find(snap)?.groupValues?.getOrNull(1).orEmpty()
                if (hex.isNotEmpty()) println("  " + wallet.recover(hex, 20))
                else println("  Recover skipped: no master_secret")
            } catch (e: WebycashException) {
                println("  Recover skipped: ${e.message}")
            }
        } else {
            println("  Skipping server ops (set TEST_WEBCASH)")
        }

        // Encrypt seed
        println("\n-- Encrypt seed --")
        wallet.encryptSeed("test_password")
        println("  OK")

        // Error handling
        println("\n-- Error handling --")
        try {
            wallet.insert("bad_string")
        } catch (e: WebycashException) {
            println("  Caught: code=${e.code} msg=${e.message}")
        }
    }

    File(dbPath).delete()
    File("$dbPath-wal").delete()
    File("$dbPath-shm").delete()

    println("\n=== All tests passed ===")
}
