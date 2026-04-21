// webycash-sdk Node.js example — full wallet lifecycle
// Run: node example.js

const path = require('path');
const fs = require('fs');
const os = require('os');

// Load from built dist
const sdk = require('../../node/dist');

async function main() {
    console.log('=== webycash-sdk Node.js Example ===');
    console.log('Version:', sdk.version());

    // Amount utilities
    console.log('\n-- Amount utilities --');
    const wats = sdk.amountParse('1.5');
    console.log(`  parse('1.5') = ${wats} wats`);
    const s = sdk.amountFormat(wats);
    console.log(`  format(${wats}) = '${s}'`);

    // Wallet lifecycle
    const dbPath = path.join(os.tmpdir(), 'webycash_sdk_node_test.db');
    try { fs.unlinkSync(dbPath); } catch {}

    console.log('\n-- Open wallet --');
    const wallet = new sdk.Wallet(dbPath);
    console.log('  Balance:', wallet.balance());
    console.log('  Stats:', wallet.stats());

    // Insert if TEST_WEBCASH is set
    const testWc = process.env.TEST_WEBCASH;
    if (testWc) {
        console.log('\n-- Insert --');
        wallet.insert(testWc);
        console.log('  Balance:', wallet.balance());

        console.log('\n-- Check --');
        wallet.check();
        console.log('  OK');

        console.log('\n-- Pay --');
        try {
            const result = wallet.pay('0.00000001', 'node-test');
            console.log('  ', result.substring(0, 60) + '...');
        } catch (e) {
            console.log('  Pay skipped:', e.message);
        }

        console.log('\n-- Merge --');
        try {
            console.log('  ', wallet.merge(20));
        } catch (e) {
            console.log('  Merge skipped:', e.message);
        }
    } else {
        console.log('  Skipping server ops (set TEST_WEBCASH)');
    }

    // Export / import snapshot
    console.log('\n-- Export / import snapshot --');
    const snapshot = wallet.exportSnapshot();
    console.log(`  Snapshot: ${snapshot.length} chars`);
    wallet.importSnapshot(snapshot);
    console.log('  Import: OK');

    // Master secret
    console.log('\n-- Master secret --');
    const secret = wallet.masterSecret();
    console.log(`  Master secret: ${secret.substring(0, 16)}... (${secret.length} chars)`);

    // List webcash
    console.log('\n-- List webcash --');
    const list = JSON.parse(wallet.listWebcash());
    console.log(`  Unspent outputs: ${list.length}`);

    // Encrypt seed
    console.log('\n-- Encrypt seed --');
    wallet.encryptSeed('test_password');
    console.log('  OK');

    // Encrypt / decrypt with password
    console.log('\n-- Encrypt / decrypt with password --');
    const encrypted = wallet.encryptWithPassword('test_password');
    console.log(`  Encrypted: ${encrypted.length} chars`);
    wallet.decryptWithPassword(encrypted, 'test_password');
    console.log('  Decrypt: OK');

    // Error handling
    console.log('\n-- Error handling --');
    try {
        wallet.insert('bad_string');
    } catch (e) {
        if (e instanceof sdk.WebycashError) {
            console.log('  Caught WebycashError:', e.message);
        }
    }

    wallet.close();

    // Cleanup
    try { fs.unlinkSync(dbPath); } catch {}
    try { fs.unlinkSync(dbPath + '-wal'); } catch {}
    try { fs.unlinkSync(dbPath + '-shm'); } catch {}

    console.log('\n=== All tests passed ===');
}

main().catch(e => { console.error(e); process.exit(1); });
