const config = require('../../test/config');
const COUNT = 1e6;
const dirty = require(config.LIB_DIRTY)();
const util = require('util');

for (var i = 0; i < COUNT; i++) {
  dirty.set(i, i);
}

const start = Date.now();
for (var i = 0; i < COUNT; i++) {
  if (dirty.get(i) !== i) {
    throw new Error('implementation fail');
  }
}

const ms = Date.now() - start;
const mhz = ((COUNT / (ms / 1000)) / 1e6).toFixed(2);
const million = COUNT / 1e6;

// Can't use console.log() since since I also test this in ancient node versions
util.log(`${mhz} Mhz (${million} million in ${ms} ms)`);
