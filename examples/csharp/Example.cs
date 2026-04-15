// webycash-sdk C# example — full wallet lifecycle
// Run (from repo root, native lib on DYLD_LIBRARY_PATH):
//   DYLD_LIBRARY_PATH=native/target/release dotnet run --project examples/csharp/Example.csproj

using WebycashSDK;

Console.WriteLine("=== webycash-sdk C# Example ===");
Console.WriteLine($"Version: {Webcash.Version()}");

// Amount utilities
Console.WriteLine("\n-- Amount utilities --");
var wats = Webcash.AmountParse("1.5");
Console.WriteLine($"  parse('1.5') = {wats} wats");
var s = Webcash.AmountFormat(wats);
Console.WriteLine($"  format({wats}) = '{s}'");

// Wallet lifecycle
var dbPath = Path.Combine(Path.GetTempPath(), "webycash_sdk_csharp_test.db");
if (File.Exists(dbPath)) File.Delete(dbPath);

Console.WriteLine("\n-- Open wallet --");
using (var wallet = new Wallet(dbPath))
{
    Console.WriteLine($"  Balance: {wallet.Balance()}");
    Console.WriteLine($"  Stats: {wallet.Stats()}");

    // Insert if TEST_WEBCASH is set
    var testWc = Environment.GetEnvironmentVariable("TEST_WEBCASH");
    if (testWc != null)
    {
        Console.WriteLine("\n-- Insert --");
        wallet.Insert(testWc);
        Console.WriteLine($"  Balance: {wallet.Balance()}");

        Console.WriteLine("\n-- Check --");
        wallet.Check();
        Console.WriteLine("  OK");
    }
    else
    {
        Console.WriteLine("  Skipping server ops (set TEST_WEBCASH)");
    }

    // Encrypt seed
    Console.WriteLine("\n-- Encrypt seed --");
    wallet.EncryptSeed("test_password");
    Console.WriteLine("  OK");

    // Error handling
    Console.WriteLine("\n-- Error handling --");
    try
    {
        wallet.Insert("bad_string");
    }
    catch (WebycashException e)
    {
        Console.WriteLine($"  Caught: code={e.Code} msg={e.Message}");
    }
}

if (File.Exists(dbPath)) File.Delete(dbPath);
Console.WriteLine("\n=== All tests passed ===");
