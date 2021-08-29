const COUNT = 1e6;
const util = require('util');
const o = {};

for (var i = 0; i < COUNT; i++) {
  o[i] = i;
}

const start = +new Date();
const keys = Object.keys(o);
const length = keys.length;
for (var i = 0; i < keys.length; i++) {
  if (o[keys[i]] != i) {
    throw new Error('implementation fail');
  }
}

const ms = +new Date() - start;
const mhz = ((COUNT / (ms / 1000)) / 1e6).toFixed(2);
const million = COUNT / 1e6;

// Can't use console.log() since since I also test this in ancient node versions
util.log(`${mhz} Mhz (${million} million in ${ms} ms)`);
