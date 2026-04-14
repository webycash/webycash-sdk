package cash.weby.sdk

import com.sun.jna.*
import com.sun.jna.ptr.PointerByReference
import java.io.Closeable

private interface WebycashLib : Library {
    fun weby_wallet_open(path: String, out: PointerByReference): Int
    fun weby_wallet_open_with_seed(path: String, seed: Pointer, seedLen: Long, out: PointerByReference): Int
    fun weby_wallet_free(wallet: Pointer)
    fun weby_wallet_balance(wallet: Pointer, out: PointerByReference): Int
    fun weby_wallet_insert(wallet: Pointer, webcash: String): Int
    fun weby_wallet_pay(wallet: Pointer, amount: String, memo: String?, out: PointerByReference): Int
    fun weby_wallet_check(wallet: Pointer): Int
    fun weby_wallet_merge(wallet: Pointer, maxOutputs: Int, out: PointerByReference): Int
    fun weby_wallet_recover(wallet: Pointer, masterSecretHex: String, gapLimit: Int, out: PointerByReference): Int
    fun weby_wallet_stats(wallet: Pointer, out: PointerByReference): Int
    fun weby_wallet_export_snapshot(wallet: Pointer, out: PointerByReference): Int
    fun weby_wallet_encrypt_seed(wallet: Pointer, password: String): Int
    fun weby_version(): String
    fun weby_last_error_message(): String?
    fun weby_amount_parse(amountStr: String, out: LongArray): Int
    fun weby_amount_format(wats: Long, out: PointerByReference): Int
    fun weby_free_string(ptr: Pointer)

    companion object {
        val INSTANCE: WebycashLib = Native.load("webycash_sdk", WebycashLib::class.java)
    }
}

class WebycashException(val code: Int, message: String) : RuntimeException(message)

private fun check(rc: Int) {
    if (rc != 0) throw WebycashException(rc, WebycashLib.INSTANCE.weby_last_error_message() ?: "Error $rc")
}

private fun takeString(ref: PointerByReference): String {
    val p = ref.value ?: return ""
    val s = p.getString(0)
    WebycashLib.INSTANCE.weby_free_string(p)
    return s
}

fun version(): String = WebycashLib.INSTANCE.weby_version()

fun amountParse(s: String): Long {
    val out = LongArray(1)
    check(WebycashLib.INSTANCE.weby_amount_parse(s, out))
    return out[0]
}

fun amountFormat(wats: Long): String {
    val out = PointerByReference()
    check(WebycashLib.INSTANCE.weby_amount_format(wats, out))
    return takeString(out)
}

class Wallet private constructor(private var ptr: Pointer?) : Closeable {

    companion object {
        fun open(path: String): Wallet {
            val out = PointerByReference()
            check(WebycashLib.INSTANCE.weby_wallet_open(path, out))
            return Wallet(out.value)
        }

        fun openWithSeed(path: String, seed: ByteArray): Wallet {
            require(seed.size == 32) { "Seed must be 32 bytes" }
            val mem = Memory(32).also { it.write(0, seed, 0, 32) }
            val out = PointerByReference()
            check(WebycashLib.INSTANCE.weby_wallet_open_with_seed(path, mem, 32, out))
            return Wallet(out.value)
        }
    }

    override fun close() { ptr?.let { WebycashLib.INSTANCE.weby_wallet_free(it); ptr = null } }

    fun balance(): String { val o = PointerByReference(); check(WebycashLib.INSTANCE.weby_wallet_balance(ptr!!, o)); return takeString(o) }
    fun insert(webcash: String) { check(WebycashLib.INSTANCE.weby_wallet_insert(ptr!!, webcash)) }
    fun pay(amount: String, memo: String = ""): String { val o = PointerByReference(); check(WebycashLib.INSTANCE.weby_wallet_pay(ptr!!, amount, memo, o)); return takeString(o) }
    fun check() { cash.weby.sdk.check(WebycashLib.INSTANCE.weby_wallet_check(ptr!!)) }
    fun merge(maxOutputs: Int = 20): String { val o = PointerByReference(); cash.weby.sdk.check(WebycashLib.INSTANCE.weby_wallet_merge(ptr!!, maxOutputs, o)); return takeString(o) }
    fun recover(masterSecretHex: String, gapLimit: Int = 20): String { val o = PointerByReference(); cash.weby.sdk.check(WebycashLib.INSTANCE.weby_wallet_recover(ptr!!, masterSecretHex, gapLimit, o)); return takeString(o) }
    fun stats(): String { val o = PointerByReference(); cash.weby.sdk.check(WebycashLib.INSTANCE.weby_wallet_stats(ptr!!, o)); return takeString(o) }
    fun exportSnapshot(): String { val o = PointerByReference(); cash.weby.sdk.check(WebycashLib.INSTANCE.weby_wallet_export_snapshot(ptr!!, o)); return takeString(o) }
    fun encryptSeed(password: String) { cash.weby.sdk.check(WebycashLib.INSTANCE.weby_wallet_encrypt_seed(ptr!!, password)) }
}
