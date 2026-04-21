using System.Text.Json;
using System.Text.RegularExpressions;
using Xunit;

namespace WebycashSDK.Tests;

public class SmokeTests
{
    [Fact]
    public void Version_NotEmpty()
    {
        var v = Webcash.Version();
        Assert.False(string.IsNullOrEmpty(v));
    }

    [Fact]
    public void Amount_Roundtrip()
    {
        Assert.Equal(150_000_000L, Webcash.AmountParse("1.5"));
        Assert.Equal("1.5", Webcash.AmountFormat(150_000_000L));
        Assert.Equal(1L, Webcash.AmountParse("0.00000001"));
        Assert.Equal("0.00000001", Webcash.AmountFormat(1L));
    }

    [Fact]
    public void Wallet_OpenBalanceClose()
    {
        var path = Path.Combine(Path.GetTempPath(), $"webycash-test-{Guid.NewGuid():N}.db");
        try
        {
            using var w = new Wallet(path);
            var b = w.Balance();
            Assert.True(b == "0" || b == "0.00000000", $"expected zero balance, got \"{b}\"");
        }
        finally
        {
            try { File.Delete(path); } catch { /* ignore */ }
        }
    }

    [Fact]
    public void ExportImportSnapshot()
    {
        var path1 = Path.Combine(Path.GetTempPath(), $"webycash-test-{Guid.NewGuid():N}.db");
        var path2 = Path.Combine(Path.GetTempPath(), $"webycash-test-{Guid.NewGuid():N}.db");
        try
        {
            string snapshot;
            using (var w1 = new Wallet(path1))
            {
                snapshot = w1.ExportSnapshot();
                Assert.False(string.IsNullOrEmpty(snapshot));
                Assert.Contains("{", snapshot);
            }

            using (var w2 = new Wallet(path2))
            {
                w2.ImportSnapshot(snapshot);
                var snap2 = w2.ExportSnapshot();
                // Compare snapshots via parsed JSON (key order may differ)
                var j1 = JsonSerializer.Deserialize<JsonElement>(snapshot);
                var j2 = JsonSerializer.Deserialize<JsonElement>(snap2);
                Assert.True(j1.GetProperty("master_secret").GetString() ==
                            j2.GetProperty("master_secret").GetString(),
                            "master_secret mismatch after import/export roundtrip");
                var b = w2.Balance();
                Assert.True(b == "0" || b == "0.00000000", $"expected zero balance after import, got \"{b}\"");
            }
        }
        finally
        {
            try { File.Delete(path1); } catch { /* ignore */ }
            try { File.Delete(path2); } catch { /* ignore */ }
        }
    }

    [Fact]
    public void ListWebcash_Empty()
    {
        var path = Path.Combine(Path.GetTempPath(), $"webycash-test-{Guid.NewGuid():N}.db");
        try
        {
            using var w = new Wallet(path);
            var list = w.ListWebcash();
            Assert.Equal("[]", list);
        }
        finally
        {
            try { File.Delete(path); } catch { /* ignore */ }
        }
    }

    [Fact]
    public void MasterSecret_Format()
    {
        var path = Path.Combine(Path.GetTempPath(), $"webycash-test-{Guid.NewGuid():N}.db");
        try
        {
            using var w = new Wallet(path);
            var secret = w.MasterSecret();
            Assert.Equal(64, secret.Length);
            Assert.Matches("^[0-9a-f]{64}$", secret);
        }
        finally
        {
            try { File.Delete(path); } catch { /* ignore */ }
        }
    }

    [Fact]
    public void MasterSecret_Deterministic()
    {
        var seed = new byte[32];
        for (int i = 0; i < 32; i++) seed[i] = 0x01;

        var path1 = Path.Combine(Path.GetTempPath(), $"webycash-test-{Guid.NewGuid():N}.db");
        var path2 = Path.Combine(Path.GetTempPath(), $"webycash-test-{Guid.NewGuid():N}.db");
        try
        {
            string secret1, secret2;
            using (var w1 = new Wallet(path1, seed))
            {
                secret1 = w1.MasterSecret();
            }
            using (var w2 = new Wallet(path2, seed))
            {
                secret2 = w2.MasterSecret();
            }
            Assert.Equal(secret1, secret2);
            Assert.Equal(64, secret1.Length);
        }
        finally
        {
            try { File.Delete(path1); } catch { /* ignore */ }
            try { File.Delete(path2); } catch { /* ignore */ }
        }
    }

    [Fact]
    public void EncryptDecrypt_Password()
    {
        var path = Path.Combine(Path.GetTempPath(), $"webycash-test-{Guid.NewGuid():N}.db");
        try
        {
            using var w = new Wallet(path);
            var encrypted = w.EncryptWithPassword("test-password-123");
            Assert.False(string.IsNullOrEmpty(encrypted));

            w.DecryptWithPassword(encrypted, "test-password-123");

            var b = w.Balance();
            Assert.True(b == "0" || b == "0.00000000", $"expected zero balance after decrypt, got \"{b}\"");
        }
        finally
        {
            try { File.Delete(path); } catch { /* ignore */ }
        }
    }

    [Fact]
    public void RecoverFromWallet_Empty()
    {
        var path = Path.Combine(Path.GetTempPath(), $"webycash-test-{Guid.NewGuid():N}.db");
        try
        {
            using var w = new Wallet(path);
            try
            {
                var result = w.RecoverFromWallet(5);
                Assert.False(string.IsNullOrEmpty(result));
            }
            catch (WebycashException ex) when (
                ex.Message.Contains("network", StringComparison.OrdinalIgnoreCase) ||
                ex.Message.Contains("connection", StringComparison.OrdinalIgnoreCase) ||
                ex.Message.Contains("resolve", StringComparison.OrdinalIgnoreCase) ||
                ex.Message.Contains("DNS", StringComparison.OrdinalIgnoreCase) ||
                ex.Message.Contains("http", StringComparison.OrdinalIgnoreCase) ||
                ex.Message.Contains("request", StringComparison.OrdinalIgnoreCase))
            {
                // Network errors are acceptable in offline tests
            }
        }
        finally
        {
            try { File.Delete(path); } catch { /* ignore */ }
        }
    }

    [Fact]
    public void ImportInvalidJson_Throws()
    {
        var path = Path.Combine(Path.GetTempPath(), $"webycash-test-{Guid.NewGuid():N}.db");
        try
        {
            using var w = new Wallet(path);
            Assert.Throws<WebycashException>(() => w.ImportSnapshot("not valid json {{{"));
        }
        finally
        {
            try { File.Delete(path); } catch { /* ignore */ }
        }
    }
}
