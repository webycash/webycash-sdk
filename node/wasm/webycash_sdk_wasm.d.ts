/* tslint:disable */
/* eslint-disable */
/* Stub — replaced by wasm-pack build output */

export function derive_secret(master_secret_hex: string, chain_code: number, depth: bigint): string;
export function format_amount(wats: bigint): string;
export function format_public_webcash(hash_hex: string, amount_wats: bigint): string;
export function format_webcash(secret: string, amount_wats: bigint): string;
export function generate_master_secret(): string;
export function init_panic_hook(): void;
export function parse_amount(s: string): bigint;
export function parse_webcash(s: string): any;
export function sdk_version(): string;
export function secret_to_public(secret: string): string;
export function sha256_hex(data: string): string;
export function verify_webcash(network: string, webcash_str: string): Promise<string>;
export function wallet_balance(state: string, network: string): bigint;
export function wallet_check(state: string, network: string): Promise<string>;
export function wallet_create(network: string): string;
export function wallet_create_with_secret(network: string, master_secret_hex: string): Promise<string>;
export function wallet_decrypt_with_password(encrypted_json: string, password: string, network: string): string;
export function wallet_encrypt_with_password(state: string, network: string, password: string): string;
export function wallet_export_snapshot(state: string, network: string): string;
export function wallet_import_snapshot(snapshot_json: string, network: string): string;
export function wallet_insert(state: string, network: string, webcash_str: string): Promise<string>;
export function wallet_list_webcash(state: string, network: string): string;
export function wallet_master_secret(state: string, network: string): string;
export function wallet_merge(state: string, network: string, max_outputs: number): Promise<string>;
export function wallet_pay(state: string, network: string, amount_wats: bigint): Promise<string>;
export function wallet_recover(state: string, network: string, master_secret_hex: string, gap_limit: number): Promise<string>;
export function wallet_recover_from_wallet(state: string, network: string, gap_limit: number): Promise<string>;
export function wallet_stats(state: string, network: string): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;
export default function __wbg_init(module_or_path?: InitInput | Promise<InitInput>): Promise<any>;
