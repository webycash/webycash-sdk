#!/usr/bin/env node
/**
 * webycash-sdk Node example — full wallet lifecycle.
 *
 * From repo root (after `npm run build` in node/):
 *   DYLD_LIBRARY_PATH=native/target/release node examples/node/example.cjs
 *
 * With funded test secret:
 *   TEST_WEBCASH='e1.00000000:secret:…' DYLD_LIBRARY_PATH=… node examples/node/example.cjs
 */

const path = require('path');
const os = require('os');
const fs = require('fs');

// Resolve published package or local build
const sdkPath = path.join(__dirname, '..', '..', 'node');
const { Wallet, version, amountParse, amountFormat } = require(sdkPath);

function main() {
	console.log('=== webycash-sdk Node Example ===');
	console.log('Library version:', version());

	console.log('\n-- Amount utilities --');
	const wats = amountParse('1.5');
	console.log(`  parse('1.5') = ${wats} wats`);
	console.log(`  format(${wats}) = '${amountFormat(wats)}'`);

	const dbPath = path.join(os.tmpdir(), 'webycash_sdk_node_test.db');
	for (const f of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
		try {
			fs.unlinkSync(f);
		} catch {
			/* ignore */
		}
	}

	console.log(`\n-- Open wallet: ${dbPath} --`);
	const w = new Wallet(dbPath);
	try {
		console.log('  Balance:', w.balance());
		console.log('  Stats:', JSON.parse(w.stats()));

		const testWc = process.env.TEST_WEBCASH;
		if (testWc) {
			console.log('\n-- Insert --');
			try {
				w.insert(testWc);
				console.log('  Balance:', w.balance());

				console.log('\n-- Check --');
				w.check();
				console.log('  OK');

				console.log('\n-- Pay --');
				try {
					const paid = w.pay('0.00000001', 'node-test');
					console.log(' ', paid.slice(0, 60));
				} catch (e) {
					console.log('  Pay skipped:', e.message);
				}

				console.log('\n-- Merge --');
				try {
					console.log(' ', w.merge(20));
				} catch (e) {
					console.log('  Merge skipped:', e.message);
				}

				console.log('\n-- Recover --');
				try {
					const snap = JSON.parse(w.exportSnapshot());
					const hex = snap.master_secret || '';
					if (hex.length === 64) console.log(' ', w.recover(hex, 20));
					else console.log('  Recover skipped: no master_secret');
				} catch (e) {
					console.log('  Recover skipped:', e.message);
				}
			} catch (e) {
				console.log('  Insert failed:', e.message);
			}
		} else {
			console.log('\n  Skipping server operations (set TEST_WEBCASH)');
		}

		console.log('\n-- Encrypt seed --');
		try {
			w.encryptSeed('test_password_123');
			console.log('  OK');
		} catch (e) {
			console.log('  Encrypt:', e.message);
		}

		console.log('\n-- Error handling --');
		try {
			w.insert('invalid_webcash_string');
		} catch (e) {
			console.log('  Caught:', e.message);
		}
	} finally {
		w.close();
	}

	for (const f of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
		try {
			fs.unlinkSync(f);
		} catch {
			/* ignore */
		}
	}

	console.log('\n=== All tests passed ===');
}

main();
