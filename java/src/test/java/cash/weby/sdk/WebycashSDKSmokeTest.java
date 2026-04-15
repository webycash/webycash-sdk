package cash.weby.sdk;

import org.junit.jupiter.api.Test;

import java.io.File;
import java.nio.file.Files;

import static org.junit.jupiter.api.Assertions.*;

public class WebycashSDKSmokeTest {

    @Test
    void versionNotEmpty() {
        assertFalse(WebycashSDK.version().isEmpty());
    }

    @Test
    void amountRoundtrip() throws Exception {
        assertEquals(150_000_000L, WebycashSDK.amountParse("1.5"));
        assertEquals("1.5", WebycashSDK.amountFormat(150_000_000L));
        assertEquals(1L, WebycashSDK.amountParse("0.00000001"));
        assertEquals("0.00000001", WebycashSDK.amountFormat(1L));
    }

    @Test
    void walletOpenBalanceClose() throws Exception {
        File f = Files.createTempFile("webycash-test-", ".db").toFile();
        f.deleteOnExit();
        try (WebycashSDK.Wallet w = new WebycashSDK.Wallet(f.getAbsolutePath())) {
            String b = w.balance();
            assertFalse(b.isEmpty());
        } finally {
            //noinspection ResultOfMethodCallIgnored
            f.delete();
        }
    }
}
