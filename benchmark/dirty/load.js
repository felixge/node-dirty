'use strict';

const assert = require('assert').strict;
const config = require('../../test/config');
const Dirty = require(config.LIB_DIRTY);

const COUNT = 1e4;
const DB_FILE = `${config.TMP_PATH}/benchmark-set-drain.dirty`;
const dirty = new Dirty(DB_FILE);
let loaded = false;

for (let i = 0; i < COUNT; i++) {
  dirty.set(i, i);
}

dirty.on('drain', () => {
  const start = Date.now();
  new Dirty(DB_FILE).on('load', (length) => {
    const ms = Date.now() - start;
    const mhz = ((COUNT / (ms / 1000)) / 1e3).toFixed(2);
    const million = COUNT / 1e6;
    console.log(`${mhz} Hz (${million} million in ${ms} ms)`);
    loaded = true;
    assert.equal(length, COUNT);
  });
});

process.on('exit', () => {
  assert.ok(loaded);
});
