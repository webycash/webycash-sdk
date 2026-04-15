"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const sdk = require("../dist/index.js");

test("version", () => {
  const v = sdk.version();
  assert.ok(typeof v === "string" && v.length > 0);
});

test("amount roundtrip", () => {
  assert.strictEqual(BigInt(sdk.amountParse("1.5")), 150000000n);
  assert.strictEqual(sdk.amountFormat(150000000n), "1.5");
  assert.strictEqual(BigInt(sdk.amountParse("0.00000001")), 1n);
  assert.strictEqual(sdk.amountFormat(1n), "0.00000001");
});

test("wallet open balance close", () => {
  const db = path.join(os.tmpdir(), `webycash-test-${process.pid}-${Date.now()}.db`);
  const w = new sdk.Wallet(db);
  try {
    const b = w.balance();
    assert.ok(typeof b === "string" && b.length > 0);
  } finally {
    w.close();
    try {
      fs.unlinkSync(db);
    } catch (_) {}
  }
});
