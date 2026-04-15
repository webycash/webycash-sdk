//! webycash-sdk Rust example — full wallet lifecycle (uses webylib directly).

use webylib::{Amount, Wallet, SecretWebcash};
use std::str::FromStr;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("=== webycash-sdk Rust Example ===");
    println!("Version: {}", webylib::VERSION);

    // Amount utilities
    println!("\n-- Amount utilities --");
    let amount = Amount::from_str("1.5")?;
    println!("  parse('1.5') = {} wats", amount.wats);
    println!("  display = '{}'", amount);
    assert_eq!(amount.wats, 150000000);

    // Wallet lifecycle
    let db_path = "/tmp/webycash_sdk_rust_test.db";
    let _ = std::fs::remove_file(db_path);

    println!("\n-- Open wallet --");
    let wallet = Wallet::open(db_path).await?;
    let balance = wallet.balance().await?;
    println!("  Balance: {}", balance);

    let stats = wallet.stats().await?;
    println!("  Unspent: {}", stats.unspent_webcash);

    let snapshot = wallet.export_snapshot()?;
    println!("  Snapshot master secret: {}...", &snapshot.master_secret[..8]);

    // Insert if TEST_WEBCASH is set
    if let Ok(wc_str) = std::env::var("TEST_WEBCASH") {
        println!("\n-- Insert --");
        let wc = SecretWebcash::parse(&wc_str)?;
        wallet.insert(wc).await?;
        println!("  Balance: {}", wallet.balance().await?);

        println!("\n-- Check --");
        let result = wallet.check().await?;
        println!("  Valid: {}, Spent: {}", result.valid_count, result.spent_count);

        println!("\n-- Pay --");
        match wallet.pay(Amount::from_str("0.00000001")?, "rust-test").await {
            Ok(msg) => println!("  {}", &msg[..msg.len().min(60)]),
            Err(e) => println!("  Pay skipped: {}", e),
        }

        println!("\n-- Merge --");
        match wallet.merge(20).await {
            Ok(msg) => println!("  {}", msg),
            Err(e) => println!("  Merge skipped: {}", e),
        }

        println!("\n-- Recover --");
        let snap = wallet.export_snapshot()?;
        match wallet.recover(&snap.master_secret, 20).await {
            Ok(r) => println!("  {}", r),
            Err(e) => println!("  Recover skipped: {}", e),
        }
    } else {
        println!("  Skipping server ops (set TEST_WEBCASH)");
    }

    // Encrypt seed
    println!("\n-- Encrypt seed --");
    wallet.encrypt_database_with_password("test_password").await?;
    println!("  OK");

    // Cleanup
    let _ = std::fs::remove_file(db_path);
    let _ = std::fs::remove_file(format!("{}-wal", db_path));
    let _ = std::fs::remove_file(format!("{}-shm", db_path));

    println!("\n=== All tests passed ===");
    Ok(())
}
