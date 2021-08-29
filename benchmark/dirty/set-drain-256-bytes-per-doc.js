'use strict';

const assert = require('assert').strict;
const config = require('../../test/config');
const Dirty = require(config.LIB_DIRTY);

const COUNT = 1e5;
const dirty = new Dirty(`${config.TMP_PATH}/benchmark-set-drain.dirty`);
let drained = false;
const val =
    'This string has 256 bytes. This string has 256 bytes. This string has 256 bytes. ' +
    'This string has 256 bytes.  This string has 256 bytes. This string has 256 bytes. ' +
    'This string has 256 bytes. This string has 256 bytes.  This string has 256 bytes. ' +
    'This string';

const start = Date.now();
for (let i = 0; i < COUNT; i++) {
  dirty.set(i, val);
}

dirty.on('drain', () => {
  const ms = Date.now() - start;
  const mhz = ((COUNT / (ms / 1000)) / 1e3).toFixed(2);
  const million = COUNT / 1e6;
  console.log(`${mhz} Hz (${million} million in ${ms} ms)`);
  drained = true;
});

process.on('exit', () => {
  assert.ok(drained);
});
