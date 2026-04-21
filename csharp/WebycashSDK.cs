using System;
using System.Runtime.InteropServices;

namespace WebycashSDK
{
    public class WebycashException : Exception
    {
        public int Code { get; }
        public WebycashException(int code, string message) : base(message) { Code = code; }
    }

    internal static class Native
    {
        const string LIB = "webycash_sdk";

        [DllImport(LIB)] public static extern int weby_wallet_open(string path, out IntPtr wallet);
        [DllImport(LIB)] public static extern int weby_wallet_open_with_seed(string path, byte[] seed, ulong seedLen, out IntPtr wallet);
        [DllImport(LIB)] public static extern void weby_wallet_free(IntPtr wallet);
        [DllImport(LIB)] public static extern int weby_wallet_balance(IntPtr wallet, out IntPtr balance);
        [DllImport(LIB)] public static extern int weby_wallet_insert(IntPtr wallet, string webcash);
        [DllImport(LIB)] public static extern int weby_wallet_pay(IntPtr wallet, string amount, string memo, out IntPtr webcash);
        [DllImport(LIB)] public static extern int weby_wallet_check(IntPtr wallet);
        [DllImport(LIB)] public static extern int weby_wallet_merge(IntPtr wallet, uint maxOutputs, out IntPtr result);
        [DllImport(LIB)] public static extern int weby_wallet_recover(IntPtr wallet, string masterSecretHex, uint gapLimit, out IntPtr result);
        [DllImport(LIB)] public static extern int weby_wallet_stats(IntPtr wallet, out IntPtr json);
        [DllImport(LIB)] public static extern int weby_wallet_export_snapshot(IntPtr wallet, out IntPtr json);
        [DllImport(LIB)] public static extern int weby_wallet_encrypt_seed(IntPtr wallet, string password);
        [DllImport(LIB)] public static extern int weby_wallet_import_snapshot(IntPtr wallet, string json);
        [DllImport(LIB)] public static extern int weby_wallet_list_webcash(IntPtr wallet, out IntPtr json);
        [DllImport(LIB)] public static extern int weby_wallet_master_secret(IntPtr wallet, out IntPtr hex);
        [DllImport(LIB)] public static extern int weby_wallet_encrypt_with_password(IntPtr wallet, string password, out IntPtr json);
        [DllImport(LIB)] public static extern int weby_wallet_decrypt_with_password(IntPtr wallet, string json, string password);
        [DllImport(LIB)] public static extern int weby_wallet_recover_from_wallet(IntPtr wallet, uint gapLimit, out IntPtr result);
        [DllImport(LIB)] public static extern IntPtr weby_version();
        [DllImport(LIB)] public static extern IntPtr weby_last_error_message();
        [DllImport(LIB)] public static extern int weby_amount_parse(string amountStr, out long wats);
        [DllImport(LIB)] public static extern int weby_amount_format(long wats, out IntPtr str);
        [DllImport(LIB)] public static extern void weby_free_string(IntPtr ptr);
    }

    internal static class Ffi
    {
        public static void Rc(int rc)
        {
            if (rc != 0)
            {
                var msg = Marshal.PtrToStringAnsi(Native.weby_last_error_message()) ?? $"Error {rc}";
                throw new WebycashException(rc, msg);
            }
        }

        public static string TakeString(IntPtr ptr)
        {
            if (ptr == IntPtr.Zero) return "";
            var s = Marshal.PtrToStringAnsi(ptr) ?? "";
            Native.weby_free_string(ptr);
            return s;
        }
    }

    public static class Webcash
    {
        public static string Version() => Marshal.PtrToStringAnsi(Native.weby_version()) ?? "";

        public static long AmountParse(string s)
        {
            Ffi.Rc(Native.weby_amount_parse(s, out var wats));
            return wats;
        }

        public static string AmountFormat(long wats)
        {
            Ffi.Rc(Native.weby_amount_format(wats, out var ptr));
            return Ffi.TakeString(ptr);
        }
    }

    public sealed class Wallet : IDisposable
    {
        private IntPtr _ptr;

        public Wallet(string path) { Ffi.Rc(Native.weby_wallet_open(path, out _ptr)); }

        public Wallet(string path, byte[] seed)
        {
            if (seed.Length != 32) throw new ArgumentException("Seed must be 32 bytes");
            Ffi.Rc(Native.weby_wallet_open_with_seed(path, seed, (ulong)seed.Length, out _ptr));
        }

        public void Dispose() { if (_ptr != IntPtr.Zero) { Native.weby_wallet_free(_ptr); _ptr = IntPtr.Zero; } }

        public string Balance() { Ffi.Rc(Native.weby_wallet_balance(_ptr, out var p)); return Ffi.TakeString(p); }
        public void Insert(string webcash) { Ffi.Rc(Native.weby_wallet_insert(_ptr, webcash)); }
        public string Pay(string amount, string memo = "") { Ffi.Rc(Native.weby_wallet_pay(_ptr, amount, memo, out var p)); return Ffi.TakeString(p); }
        public void Check() { WebycashSDK.Ffi.Rc(Native.weby_wallet_check(_ptr)); }
        public string Merge(uint maxOutputs = 20) { WebycashSDK.Ffi.Rc(Native.weby_wallet_merge(_ptr, maxOutputs, out var p)); return WebycashSDK.Ffi.TakeString(p); }
        public string Recover(string masterSecretHex, uint gapLimit = 20) { WebycashSDK.Ffi.Rc(Native.weby_wallet_recover(_ptr, masterSecretHex, gapLimit, out var p)); return WebycashSDK.Ffi.TakeString(p); }
        public string Stats() { WebycashSDK.Ffi.Rc(Native.weby_wallet_stats(_ptr, out var p)); return WebycashSDK.Ffi.TakeString(p); }
        public string ExportSnapshot() { WebycashSDK.Ffi.Rc(Native.weby_wallet_export_snapshot(_ptr, out var p)); return WebycashSDK.Ffi.TakeString(p); }
        public void EncryptSeed(string password) { WebycashSDK.Ffi.Rc(Native.weby_wallet_encrypt_seed(_ptr, password)); }
        public void ImportSnapshot(string json) { WebycashSDK.Ffi.Rc(Native.weby_wallet_import_snapshot(_ptr, json)); }
        public string ListWebcash() { WebycashSDK.Ffi.Rc(Native.weby_wallet_list_webcash(_ptr, out var p)); return WebycashSDK.Ffi.TakeString(p); }
        public string MasterSecret() { WebycashSDK.Ffi.Rc(Native.weby_wallet_master_secret(_ptr, out var p)); return WebycashSDK.Ffi.TakeString(p); }
        public string EncryptWithPassword(string password) { WebycashSDK.Ffi.Rc(Native.weby_wallet_encrypt_with_password(_ptr, password, out var p)); return WebycashSDK.Ffi.TakeString(p); }
        public void DecryptWithPassword(string encryptedJson, string password) { WebycashSDK.Ffi.Rc(Native.weby_wallet_decrypt_with_password(_ptr, encryptedJson, password)); }
        public string RecoverFromWallet(uint gapLimit = 20) { WebycashSDK.Ffi.Rc(Native.weby_wallet_recover_from_wallet(_ptr, gapLimit, out var p)); return WebycashSDK.Ffi.TakeString(p); }
    }
}
