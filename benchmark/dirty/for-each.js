'use strict';

const config = require('../../test/config');
const COUNT = 1e6;
const dirty = require(config.LIB_DIRTY)();

for (let i = 0; i < COUNT; i++) {
  dirty.set(i, i);
}

const start = Date.now();
dirty.forEach((key, doc) => {
  if (!key && key !== 0) {
    throw new Error('implementation fail');
  }
});

const ms = Date.now() - start;
const mhz = ((COUNT / (ms / 1000)) / 1e6).toFixed(2);
const million = COUNT / 1e6;
console.log(`${mhz} Mhz (${million} million in ${ms} ms)`);
