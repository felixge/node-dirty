const COUNT = 1e7;
const util = require('util');
const o = {};

for (var i = 0; i < COUNT; i++) {
  o[i] = i;
}

const start = +new Date();
for (var i = 0; i < COUNT; i++) {
  if (o[i] !== i) {
    throw new Error('implementation fail');
  }
}

const ms = +new Date() - start;
const mhz = ((COUNT / (ms / 1000)) / 1e6).toFixed(2);
const million = COUNT / 1e6;

// Can't use console.log() since since I also test this in ancient node versions
util.log(`${mhz} Mhz (${million} million in ${ms} ms)`);
