package cash.weby.sdk;

import com.sun.jna.*;
import com.sun.jna.ptr.PointerByReference;

public class WebycashSDK {

    public static class WebycashException extends RuntimeException {
        public final int code;
        public WebycashException(int code, String message) { super(message); this.code = code; }
    }

    private interface Lib extends Library {
        Lib INSTANCE = Native.load("webycash_sdk", Lib.class);
        int weby_wallet_open(String path, PointerByReference out);
        int weby_wallet_open_with_seed(String path, Pointer seed, long seedLen, PointerByReference out);
        void weby_wallet_free(Pointer wallet);
        int weby_wallet_balance(Pointer wallet, PointerByReference out);
        int weby_wallet_insert(Pointer wallet, String webcash);
        int weby_wallet_pay(Pointer wallet, String amount, String memo, PointerByReference out);
        int weby_wallet_check(Pointer wallet);
        int weby_wallet_merge(Pointer wallet, int maxOutputs, PointerByReference out);
        int weby_wallet_recover(Pointer wallet, String masterSecretHex, int gapLimit, PointerByReference out);
        int weby_wallet_stats(Pointer wallet, PointerByReference out);
        int weby_wallet_export_snapshot(Pointer wallet, PointerByReference out);
        int weby_wallet_encrypt_seed(Pointer wallet, String password);
        String weby_version();
        String weby_last_error_message();
        int weby_amount_parse(String amountStr, long[] out);
        int weby_amount_format(long wats, PointerByReference out);
        void weby_free_string(Pointer ptr);
    }

    private static void check(int rc) {
        if (rc != 0) {
            String msg = Lib.INSTANCE.weby_last_error_message();
            throw new WebycashException(rc, msg != null ? msg : "Error " + rc);
        }
    }

    private static String takeString(PointerByReference ref) {
        Pointer p = ref.getValue();
        if (p == null) return "";
        String s = p.getString(0);
        Lib.INSTANCE.weby_free_string(p);
        return s;
    }

    public static String version() { return Lib.INSTANCE.weby_version(); }

    public static long amountParse(String s) {
        long[] out = new long[1];
        check(Lib.INSTANCE.weby_amount_parse(s, out));
        return out[0];
    }

    public static String amountFormat(long wats) {
        PointerByReference out = new PointerByReference();
        check(Lib.INSTANCE.weby_amount_format(wats, out));
        return takeString(out);
    }

    public static class Wallet implements AutoCloseable {
        private Pointer ptr;

        public Wallet(String path) {
            PointerByReference out = new PointerByReference();
            WebycashSDK.check(Lib.INSTANCE.weby_wallet_open(path, out));
            this.ptr = out.getValue();
        }

        public Wallet(String path, byte[] seed) {
            if (seed.length != 32) throw new IllegalArgumentException("Seed must be 32 bytes");
            Memory mem = new Memory(32);
            mem.write(0, seed, 0, 32);
            PointerByReference out = new PointerByReference();
            WebycashSDK.check(Lib.INSTANCE.weby_wallet_open_with_seed(path, mem, 32, out));
            this.ptr = out.getValue();
        }

        @Override public void close() { if (ptr != null) { Lib.INSTANCE.weby_wallet_free(ptr); ptr = null; } }
        public String balance() { PointerByReference o = new PointerByReference(); WebycashSDK.check(Lib.INSTANCE.weby_wallet_balance(ptr, o)); return takeString(o); }
        public void insert(String webcash) { WebycashSDK.check(Lib.INSTANCE.weby_wallet_insert(ptr, webcash)); }
        public String pay(String amount, String memo) { PointerByReference o = new PointerByReference(); WebycashSDK.check(Lib.INSTANCE.weby_wallet_pay(ptr, amount, memo, o)); return takeString(o); }
        public void check() { WebycashSDK.check(Lib.INSTANCE.weby_wallet_check(ptr)); }
        public String merge(int maxOutputs) { PointerByReference o = new PointerByReference(); WebycashSDK.check(Lib.INSTANCE.weby_wallet_merge(ptr, maxOutputs, o)); return takeString(o); }
        public String recover(String masterSecretHex, int gapLimit) { PointerByReference o = new PointerByReference(); WebycashSDK.check(Lib.INSTANCE.weby_wallet_recover(ptr, masterSecretHex, gapLimit, o)); return takeString(o); }
        public String stats() { PointerByReference o = new PointerByReference(); WebycashSDK.check(Lib.INSTANCE.weby_wallet_stats(ptr, o)); return takeString(o); }
        public String exportSnapshot() { PointerByReference o = new PointerByReference(); WebycashSDK.check(Lib.INSTANCE.weby_wallet_export_snapshot(ptr, o)); return takeString(o); }
        public void encryptSeed(String password) { WebycashSDK.check(Lib.INSTANCE.weby_wallet_encrypt_seed(ptr, password)); }
    }
}
