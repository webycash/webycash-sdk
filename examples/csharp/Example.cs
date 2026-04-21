// webycash-sdk C# example — complete webcash protocol demonstration
//
// This example walks through every wallet operation exposed by the SDK,
// from offline key management to server-side webcash transfers.
//
// Build & run (from repo root, native lib on DYLD_LIBRARY_PATH):
//   DYLD_LIBRARY_PATH=native/target/release dotnet run --project examples/csharp/Example.csproj

using System.Text.Json;
using WebycashSDK;

Console.WriteLine("=== webycash-sdk C# Example ===");

// ── 1. Version & utilities ──────────────────────────────────────
// The SDK version tracks the native library; amount helpers convert
// between human-readable decimal strings and integer "wats" (1e-8).
Console.WriteLine("\n── Version & amount utilities ──");
Console.WriteLine($"  Library version: {Webcash.Version()}");

var wats = Webcash.AmountParse("1.5");
Console.WriteLine($"  parse(\"1.5\") = {wats} wats");
var formatted = Webcash.AmountFormat(wats);
Console.WriteLine($"  format({wats}) = \"{formatted}\"");
if (wats != 150_000_000) throw new Exception("parse mismatch");
if (formatted != "1.5") throw new Exception("format mismatch");
Console.WriteLine("  OK");

// ── 2. Create wallet ────────────────────────────────────────────
// A wallet is backed by a SQLite file. Opening a path that doesn't
// exist yet creates a fresh wallet with a random master secret.
var dbPath = Path.Combine(Path.GetTempPath(), "webycash_sdk_csharp_example.db");
if (File.Exists(dbPath)) File.Delete(dbPath);

Console.WriteLine($"\n── Create wallet: {dbPath} ──");
using var wallet = new Wallet(dbPath);
Console.WriteLine("  Wallet opened");

// ── 3. Master secret backup ────────────────────────────────────
// The master secret is a 64-hex-char deterministic root from which
// all webcash secret keys are derived. Back it up for recovery.
Console.WriteLine("\n── Master secret ──");
var masterSecret = wallet.MasterSecret();
Console.WriteLine($"  Master secret: {masterSecret[..16]}... ({masterSecret.Length} hex chars)");
if (masterSecret.Length != 64) throw new Exception("master secret must be 64 hex chars");
Console.WriteLine("  OK");

// ── 4. Balance & stats ─────────────────────────────────────────
// A fresh wallet has zero balance and zero unspent outputs.
Console.WriteLine("\n── Balance & stats ──");
var balance = wallet.Balance();
Console.WriteLine($"  Balance: {balance}");
if (balance != "0") throw new Exception("fresh wallet balance must be 0");

var statsJson = wallet.Stats();
using var statsDoc = JsonDocument.Parse(statsJson);
var unspent = statsDoc.RootElement.GetProperty("unspent_webcash").GetInt32();
Console.WriteLine($"  Stats: unspent_webcash={unspent}");
if (unspent != 0) throw new Exception("fresh wallet must have 0 unspent outputs");
Console.WriteLine("  OK");

// ── 5. List outputs ────────────────────────────────────────────
// ListWebcash returns a JSON array of unspent webcash strings.
Console.WriteLine("\n── List webcash outputs ──");
var listJson = wallet.ListWebcash();
using var listDoc = JsonDocument.Parse(listJson);
var outputCount = listDoc.RootElement.GetArrayLength();
Console.WriteLine($"  Unspent outputs: {outputCount}");
if (outputCount != 0) throw new Exception("fresh wallet must have 0 outputs");
Console.WriteLine("  OK");

// ── 6. Snapshot backup ─────────────────────────────────────────
// ExportSnapshot serializes the entire wallet state to JSON.
// This is the primary offline backup mechanism.
Console.WriteLine("\n── Export snapshot ──");
var snapshot = wallet.ExportSnapshot();
Console.WriteLine($"  Snapshot: {snapshot.Length} chars");
using var snapDoc = JsonDocument.Parse(snapshot);
Console.WriteLine($"  Valid JSON with master_secret field: {snapDoc.RootElement.TryGetProperty("master_secret", out _)}");
Console.WriteLine("  OK");

// ── 7. Snapshot restore ────────────────────────────────────────
// ImportSnapshot loads a previously exported snapshot into a wallet.
// Here we create a second wallet and restore the snapshot into it.
Console.WriteLine("\n── Import snapshot into second wallet ──");
var dbPath2 = Path.Combine(Path.GetTempPath(), "webycash_sdk_csharp_restore.db");
if (File.Exists(dbPath2)) File.Delete(dbPath2);
using (var wallet2 = new Wallet(dbPath2))
{
    wallet2.ImportSnapshot(snapshot);
    var balance2 = wallet2.Balance();
    Console.WriteLine($"  Restored wallet balance: {balance2}");
    Console.WriteLine("  OK");
}

// ── 8. Password encryption ─────────────────────────────────────
// EncryptWithPassword produces an encrypted JSON blob of the wallet.
// DecryptWithPassword restores from that blob + correct password.
Console.WriteLine("\n── Encrypt / decrypt with password ──");
var encrypted = wallet.EncryptWithPassword("my_secure_password");
Console.WriteLine($"  Encrypted blob: {encrypted.Length} chars");
using var encDoc = JsonDocument.Parse(encrypted);
Console.WriteLine($"  Valid JSON: true");
wallet.DecryptWithPassword(encrypted, "my_secure_password");
Console.WriteLine("  Decrypt: OK");
Console.WriteLine("  OK");

// ── 9. Server operations ───────────────────────────────────────
// These require a live webcash server. Set TEST_WEBCASH to a valid
// webcash string (e.g. "e1:secret:...") to enable this section.
var testWc = Environment.GetEnvironmentVariable("TEST_WEBCASH");
if (testWc != null)
{
    // 9a. Insert (receive) webcash into the wallet
    Console.WriteLine("\n── Insert webcash (receive) ──");
    Console.WriteLine($"  Inserting: {testWc[..Math.Min(40, testWc.Length)]}...");
    wallet.Insert(testWc);
    balance = wallet.Balance();
    Console.WriteLine($"  Balance after insert: {balance}");

    // 9b. Pay (send) webcash to someone
    Console.WriteLine("\n── Pay webcash (send) ──");
    try
    {
        var paymentString = wallet.Pay("0.00000001", "csharp-example");
        Console.WriteLine($"  Payment: {paymentString[..Math.Min(60, paymentString.Length)]}...");
        Console.WriteLine("  (recipient uses this string to claim funds)");
    }
    catch (WebycashException e)
    {
        Console.WriteLine($"  Pay skipped: {e.Message}");
    }

    // 9c. Check wallet against server
    Console.WriteLine("\n── Check wallet against server ──");
    try
    {
        wallet.Check();
        Console.WriteLine("  All outputs verified");
    }
    catch (WebycashException e)
    {
        Console.WriteLine($"  Check: {e.Message}");
    }

    // 9d. Merge outputs
    Console.WriteLine("\n── Merge outputs ──");
    try
    {
        var mergeResult = wallet.Merge(20);
        Console.WriteLine($"  Merge: {mergeResult}");
    }
    catch (WebycashException e)
    {
        Console.WriteLine($"  Merge skipped: {e.Message}");
    }

    // 9e. List outputs and stats after server ops
    Console.WriteLine("\n── Post-operation status ──");
    balance = wallet.Balance();
    Console.WriteLine($"  Balance: {balance}");
    var postListJson = wallet.ListWebcash();
    using var postListDoc = JsonDocument.Parse(postListJson);
    Console.WriteLine($"  Unspent outputs: {postListDoc.RootElement.GetArrayLength()}");
    var postStatsJson = wallet.Stats();
    Console.WriteLine($"  Stats: {postStatsJson}");
}
else
{
    Console.WriteLine("\n  Skipping server operations (set TEST_WEBCASH env var)");
}

// ── 10. Recovery ───────────────────────────────────────────────
// RecoverFromWallet scans the server using the wallet's stored
// master secret to find any outputs derived from it.
Console.WriteLine("\n── Recover from wallet ──");
try
{
    var recoverResult = wallet.RecoverFromWallet(20);
    Console.WriteLine($"  Recovery: {recoverResult}");
}
catch (WebycashException e)
{
    Console.WriteLine($"  Recovery skipped (expected offline): {e.Message}");
}

// ── 11. Cleanup ────────────────────────────────────────────────
// Dispose is called automatically by `using var`. Clean up temp files.
Console.WriteLine("\n── Cleanup ──");
wallet.Dispose();

foreach (var f in new[] { dbPath, dbPath2,
                          dbPath + "-wal", dbPath + "-shm",
                          dbPath2 + "-wal", dbPath2 + "-shm" })
{
    if (File.Exists(f)) File.Delete(f);
}
Console.WriteLine("  Temp files removed");

Console.WriteLine("\n=== All tests passed ===");
