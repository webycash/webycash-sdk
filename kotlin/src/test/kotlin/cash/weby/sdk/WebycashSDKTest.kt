package cash.weby.sdk

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.io.File

class WebycashSDKTest {
    @Test
    fun versionNotEmpty() {
        assertTrue(version().isNotEmpty())
    }

    @Test
    fun amountRoundtrip() {
        assertEquals(150_000_000L, amountParse("1.5"))
        assertEquals("1.5", amountFormat(150_000_000L))
        assertEquals(1L, amountParse("0.00000001"))
        assertEquals("0.00000001", amountFormat(1L))
    }

    @Test
    fun walletOpenBalanceClose() {
        val f = File.createTempFile("webycash-test-", ".db")
        f.deleteOnExit()
        Wallet.open(f.absolutePath).use { w ->
            val b = w.balance()
            assertTrue(b.isNotEmpty())
        }
        f.delete()
    }
}
