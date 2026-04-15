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
    public void Wallet_OpenBalanceDispose()
    {
        var path = Path.Combine(Path.GetTempPath(), $"webycash-test-{Guid.NewGuid():N}.db");
        try
        {
            using var w = new Wallet(path);
            var b = w.Balance();
            Assert.False(string.IsNullOrEmpty(b));
        }
        finally
        {
            try { File.Delete(path); } catch { /* ignore */ }
        }
    }
}
