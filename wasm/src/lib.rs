//! Webcash SDK — WebAssembly bindings.
//!
//! Thin delegation layer over webylib's WASM-compatible API.
//! Every function is 1-5 lines. Business logic lives in webylib.

use sha2::Digest;
use std::str::FromStr;
use wasm_bindgen::prelude::*;
use webylib::server::{NetworkMode, ServerClient, ServerConfig};
use webylib::wallet::Wallet;
use webylib::{Amount, SecretWebcash};

fn e(err: impl std::fmt::Display) -> JsError {
    JsError::new(&err.to_string())
}

fn net(s: &str) -> NetworkMode {
    if s == "testnet" {
        NetworkMode::Testnet
    } else {
        NetworkMode::Production
    }
}

fn w(state: &str, network: &str) -> Result<Wallet, JsError> {
    Wallet::from_json(state, net(network)).map_err(e)
}

#[wasm_bindgen(start)]
pub fn init_panic_hook() {
    console_error_panic_hook::set_once();
}

// ── Wallet Lifecycle ────────────────────────────────────────────

/// Create a new wallet with a random master secret. Returns JSON state.
#[wasm_bindgen]
pub fn wallet_create(network: &str) -> Result<String, JsError> {
    Wallet::new_memory(net(network))
        .and_then(|w| w.to_json())
        .map_err(e)
}

/// Create a wallet from a known master secret hex. Returns JSON state.
#[wasm_bindgen]
pub async fn wallet_create_with_secret(
    network: &str,
    master_secret_hex: &str,
) -> Result<String, JsError> {
    let wl = Wallet::new_memory(net(network)).map_err(e)?;
    wl.store_master_secret(master_secret_hex).await.map_err(e)?;
    wl.to_json().map_err(e)
}

// ── Core Operations (async — hit server) ────────────────────────

/// Insert webcash into the wallet. Returns updated JSON state.
#[wasm_bindgen]
pub async fn wallet_insert(
    state: &str,
    network: &str,
    webcash_str: &str,
) -> Result<String, JsError> {
    let wl = w(state, network)?;
    wl.insert(SecretWebcash::parse(webcash_str).map_err(e)?)
        .await
        .map_err(e)?;
    wl.to_json().map_err(e)
}

/// Pay an amount. Returns JSON `{"state": "...", "payment_webcash": "e..."}`.
#[wasm_bindgen]
pub async fn wallet_pay(
    state: &str,
    network: &str,
    amount_wats: i64,
) -> Result<String, JsError> {
    let wl = w(state, network)?;
    let out = wl
        .pay(Amount::from_wats(amount_wats), "")
        .await
        .map_err(e)?;
    Ok(serde_json::to_string(&serde_json::json!({
        "state": wl.to_json().map_err(e)?,
        "payment_webcash": out,
    }))
    .map_err(e)?)
}

/// Check wallet outputs against server. Returns JSON with state and counts.
#[wasm_bindgen]
pub async fn wallet_check(state: &str, network: &str) -> Result<String, JsError> {
    let wl = w(state, network)?;
    let r = wl.check().await.map_err(e)?;
    Ok(serde_json::to_string(&serde_json::json!({
        "state": wl.to_json().map_err(e)?,
        "valid_count": r.valid_count,
        "spent_count": r.spent_count,
    }))
    .map_err(e)?)
}

/// Merge small outputs. Returns JSON with state and message.
#[wasm_bindgen]
pub async fn wallet_merge(
    state: &str,
    network: &str,
    max_outputs: u32,
) -> Result<String, JsError> {
    let wl = w(state, network)?;
    let msg = wl.merge(max_outputs as usize).await.map_err(e)?;
    Ok(serde_json::to_string(&serde_json::json!({
        "state": wl.to_json().map_err(e)?,
        "message": msg,
    }))
    .map_err(e)?)
}

/// Recover wallet from an external master secret hex.
#[wasm_bindgen]
pub async fn wallet_recover(
    state: &str,
    network: &str,
    master_secret_hex: &str,
    gap_limit: u32,
) -> Result<String, JsError> {
    let wl = w(state, network)?;
    let r = wl
        .recover(master_secret_hex, gap_limit as usize)
        .await
        .map_err(e)?;
    Ok(serde_json::to_string(&serde_json::json!({
        "state": wl.to_json().map_err(e)?,
        "recovered_count": r.recovered_count,
        "total_amount": r.total_amount.wats,
    }))
    .map_err(e)?)
}

/// Recover wallet using its own stored master secret.
#[wasm_bindgen]
pub async fn wallet_recover_from_wallet(
    state: &str,
    network: &str,
    gap_limit: u32,
) -> Result<String, JsError> {
    let wl = w(state, network)?;
    let r = wl
        .recover_from_wallet(gap_limit as usize)
        .await
        .map_err(e)?;
    Ok(serde_json::to_string(&serde_json::json!({
        "state": wl.to_json().map_err(e)?,
        "recovered_count": r.recovered_count,
        "total_amount": r.total_amount.wats,
    }))
    .map_err(e)?)
}

/// Verify a webcash string against the server.
#[wasm_bindgen]
pub async fn verify_webcash(network: &str, webcash_str: &str) -> Result<String, JsError> {
    let parsed = SecretWebcash::parse(webcash_str).map_err(e)?;
    let pub_wc = parsed.to_public();
    let client = ServerClient::with_config(ServerConfig {
        network: net(network),
        timeout_seconds: 30,
    })
    .map_err(e)?;
    let r = client
        .health_check(std::slice::from_ref(&pub_wc))
        .await
        .map_err(e)?;
    let hr = r.results.values().next();
    Ok(serde_json::to_string(&serde_json::json!({
        "spent": hr.and_then(|h| h.spent),
        "amount": hr.and_then(|h| h.amount.clone()),
    }))
    .map_err(e)?)
}

// ── Inspection (sync — pure computation) ────────────────────────

/// Get wallet balance in wats.
#[wasm_bindgen]
pub fn wallet_balance(state: &str, network: &str) -> Result<i64, JsError> {
    Ok(w(state, network)?
        .export_snapshot()
        .map_err(e)?
        .unspent_outputs
        .iter()
        .map(|o| o.amount)
        .sum())
}

/// Get wallet statistics as JSON.
#[wasm_bindgen]
pub fn wallet_stats(state: &str, network: &str) -> Result<String, JsError> {
    let wl = w(state, network)?;
    let snap = wl.export_snapshot().map_err(e)?;
    let balance: i64 = snap.unspent_outputs.iter().map(|o| o.amount).sum();
    Ok(serde_json::to_string(&serde_json::json!({
        "total_webcash": snap.unspent_outputs.len() + snap.spent_hashes.len(),
        "unspent_webcash": snap.unspent_outputs.len(),
        "spent_webcash": snap.spent_hashes.len(),
        "total_balance": balance,
    }))
    .map_err(e)?)
}

/// Export wallet snapshot as JSON.
#[wasm_bindgen]
pub fn wallet_export_snapshot(state: &str, network: &str) -> Result<String, JsError> {
    serde_json::to_string(&w(state, network)?.export_snapshot().map_err(e)?).map_err(e)
}

/// Import wallet from a snapshot JSON. Returns new state.
#[wasm_bindgen]
pub fn wallet_import_snapshot(snapshot_json: &str, network: &str) -> Result<String, JsError> {
    let snapshot: webylib::wallet::WalletSnapshot =
        serde_json::from_str(snapshot_json).map_err(e)?;
    let wl = Wallet::new_memory(net(network)).map_err(e)?;
    wl.import_snapshot(&snapshot).map_err(e)?;
    wl.to_json().map_err(e)
}

/// List all unspent webcash as JSON array of strings.
#[wasm_bindgen]
pub fn wallet_list_webcash(state: &str, network: &str) -> Result<String, JsError> {
    let snap = w(state, network)?.export_snapshot().map_err(e)?;
    let list: Vec<String> = snap
        .unspent_outputs
        .iter()
        .map(|o| format!("e{}:secret:{}", Amount::from_wats(o.amount), o.secret))
        .collect();
    serde_json::to_string(&list).map_err(e)
}

/// Get the master secret as a 64-character hex string.
#[wasm_bindgen]
pub fn wallet_master_secret(state: &str, network: &str) -> Result<String, JsError> {
    w(state, network)?.master_secret_hex().map_err(e)
}

// ── Encryption ──────────────────────────────────────────────────

/// Encrypt wallet data with a password. Returns encrypted JSON blob.
#[wasm_bindgen]
pub fn wallet_encrypt_with_password(
    state: &str,
    network: &str,
    password: &str,
) -> Result<String, JsError> {
    let snapshot = wallet_export_snapshot(state, network)?;
    webylib_wasm_crypto::encrypt_data(snapshot.as_bytes(), password)
}

/// Decrypt wallet data from encrypted JSON. Returns new wallet state.
#[wasm_bindgen]
pub fn wallet_decrypt_with_password(
    encrypted_json: &str,
    password: &str,
    network: &str,
) -> Result<String, JsError> {
    let decrypted = webylib_wasm_crypto::decrypt_data(encrypted_json, password)?;
    let snapshot_json =
        String::from_utf8(decrypted).map_err(|_| JsError::new("decrypted data is not UTF-8"))?;
    wallet_import_snapshot(&snapshot_json, network)
}

// ── Crypto Utilities ────────────────────────────────────────────

/// Derive a secret from master secret using HD wallet derivation.
#[wasm_bindgen]
pub fn derive_secret(
    master_secret_hex: &str,
    chain_code: u32,
    depth: u64,
) -> Result<String, JsError> {
    let master_bytes =
        hex::decode(master_secret_hex).map_err(|_| JsError::new("invalid master secret hex"))?;
    if master_bytes.len() != 32 {
        return Err(JsError::new(
            "master secret must be 32 bytes (64 hex chars)",
        ));
    }
    let tag = sha2::Sha256::digest(b"webcashwalletv1");
    let mut hasher = sha2::Sha256::new();
    hasher.update(&tag);
    hasher.update(&tag);
    hasher.update(&master_bytes);
    hasher.update((chain_code as u64).to_be_bytes());
    hasher.update(depth.to_be_bytes());
    Ok(hex::encode(hasher.finalize()))
}

/// Generate a random 32-byte master secret as hex.
#[wasm_bindgen]
pub fn generate_master_secret() -> Result<String, JsError> {
    let mut bytes = [0u8; 32];
    getrandom::getrandom(&mut bytes).map_err(|e| JsError::new(&format!("RNG failed: {}", e)))?;
    Ok(hex::encode(bytes))
}

/// SHA-256 hash of a string, returned as hex.
#[wasm_bindgen]
pub fn sha256_hex(data: &str) -> String {
    hex::encode(sha2::Sha256::digest(data.as_bytes()))
}

/// Hash a secret string to its public webcash hash (SHA-256 of ASCII).
#[wasm_bindgen]
pub fn secret_to_public(secret: &str) -> String {
    sha256_hex(secret)
}

// ── Webcash Utilities ───────────────────────────────────────────

/// Parse a webcash string. Returns JSON `{secret, amount_wats, amount_display, public_hash}`.
#[wasm_bindgen]
pub fn parse_webcash(s: &str) -> Result<JsValue, JsError> {
    let wc = SecretWebcash::parse(s).map_err(e)?;
    let sec = wc.secret.as_str().map_err(e)?;
    serde_wasm_bindgen::to_value(&serde_json::json!({
        "secret": sec,
        "amount_wats": wc.amount.wats,
        "amount_display": wc.amount.to_string(),
        "public_hash": hex::encode(sha2::Sha256::digest(sec.as_bytes())),
    }))
    .map_err(e)
}

/// Format a webcash string from secret and amount in wats.
#[wasm_bindgen]
pub fn format_webcash(secret: &str, amount_wats: i64) -> String {
    format!("e{}:secret:{}", Amount::from_wats(amount_wats), secret)
}

/// Format a public webcash string from hash and amount in wats.
#[wasm_bindgen]
pub fn format_public_webcash(hash_hex: &str, amount_wats: i64) -> String {
    format!("e{}:public:{}", Amount::from_wats(amount_wats), hash_hex)
}

// ── Amount Utilities ────────────────────────────────────────────

/// Parse an amount string to wats.
#[wasm_bindgen]
pub fn parse_amount(s: &str) -> Result<i64, JsError> {
    Ok(Amount::from_str(s).map_err(e)?.wats)
}

/// Format wats as a decimal amount string.
#[wasm_bindgen]
pub fn format_amount(wats: i64) -> String {
    Amount::from_wats(wats).to_string()
}

// ── Meta ────────────────────────────────────────────────────────

/// SDK version string.
#[wasm_bindgen]
pub fn sdk_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

// ── Internal crypto module for password encryption ──────────────

mod webylib_wasm_crypto {
    use super::*;
    use aes_gcm::aead::{generic_array::GenericArray, Aead, KeyInit};
    use aes_gcm::Aes256Gcm;
    use serde::{Deserialize, Serialize};

    #[derive(Serialize, Deserialize)]
    struct EncryptedData {
        ciphertext: Vec<u8>,
        nonce: [u8; 12],
        salt: [u8; 32],
        algorithm: String,
        kdf_params: KdfParams,
        metadata: EncryptionMetadata,
    }

    #[derive(Serialize, Deserialize)]
    struct KdfParams {
        info: String,
        memory_cost: u32,
        parallelism: u32,
    }

    #[derive(Serialize, Deserialize)]
    struct EncryptionMetadata {
        encrypted_at: String,
        platform: String,
        version: String,
    }

    pub fn encrypt_data(plaintext: &[u8], password: &str) -> Result<String, JsError> {
        let mut salt = [0u8; 32];
        getrandom::getrandom(&mut salt)
            .map_err(|e| JsError::new(&format!("salt generation failed: {}", e)))?;

        let mut key_bytes = [0u8; 32];
        argon2::Argon2::default()
            .hash_password_into(password.as_bytes(), &salt, &mut key_bytes)
            .map_err(|e| JsError::new(&format!("key derivation failed: {}", e)))?;

        let cipher = Aes256Gcm::new_from_slice(&key_bytes)
            .map_err(|e| JsError::new(&format!("cipher init failed: {}", e)))?;

        let mut nonce_bytes = [0u8; 12];
        getrandom::getrandom(&mut nonce_bytes)
            .map_err(|e| JsError::new(&format!("nonce generation failed: {}", e)))?;
        let nonce = GenericArray::from_slice(&nonce_bytes);

        let ciphertext = cipher
            .encrypt(nonce, plaintext)
            .map_err(|e| JsError::new(&format!("encryption failed: {}", e)))?;

        let now_ms = (js_sys::Date::now() / 1000.0) as u64;

        let encrypted = EncryptedData {
            ciphertext,
            nonce: nonce_bytes,
            salt,
            algorithm: "AES-256-GCM-PASSWORD".to_string(),
            kdf_params: KdfParams {
                info: "webycash-password-v1".to_string(),
                memory_cost: 65536,
                parallelism: 4,
            },
            metadata: EncryptionMetadata {
                encrypted_at: now_ms.to_string(),
                platform: "wasm".to_string(),
                version: "1.0".to_string(),
            },
        };

        serde_json::to_string(&encrypted).map_err(|e| JsError::new(&e.to_string()))
    }

    pub fn decrypt_data(encrypted_json: &str, password: &str) -> Result<Vec<u8>, JsError> {
        let encrypted: EncryptedData =
            serde_json::from_str(encrypted_json).map_err(|e| JsError::new(&e.to_string()))?;

        if encrypted.algorithm != "AES-256-GCM-PASSWORD" {
            return Err(JsError::new("wrong decryption method for this data"));
        }

        let mut key_bytes = [0u8; 32];
        argon2::Argon2::default()
            .hash_password_into(password.as_bytes(), &encrypted.salt, &mut key_bytes)
            .map_err(|e| JsError::new(&format!("key derivation failed: {}", e)))?;

        let cipher = Aes256Gcm::new_from_slice(&key_bytes)
            .map_err(|e| JsError::new(&format!("cipher init failed: {}", e)))?;

        let nonce = GenericArray::from_slice(&encrypted.nonce);
        cipher
            .decrypt(nonce, encrypted.ciphertext.as_slice())
            .map_err(|e| JsError::new(&format!("decryption failed: {}", e)))
    }
}
