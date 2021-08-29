const config = require('../../test/config');
const Dirty = require(config.LIB_DIRTY);

const COUNT = 1e6;
const dirty = new Dirty(`${config.TMP_PATH}/benchmark-set.dirty`);
const util = require('util');

const start = Date.now();
for (let i = 0; i < COUNT; i++) {
  dirty.set(i, i);
}

const ms = Date.now() - start;
const mhz = ((COUNT / (ms / 1000)) / 1e6).toFixed(2);
const million = COUNT / 1e6;

// Can't use console.log() since since I also test this in ancient node versions
util.log(`${mhz} Mhz (${million} million in ${ms} ms)`);
