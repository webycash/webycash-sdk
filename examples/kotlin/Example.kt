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
