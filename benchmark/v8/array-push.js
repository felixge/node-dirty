const COUNT = 1e6;
const util = require('util');
const a = [];

const start = +new Date();
for (let i = 0; i < COUNT; i++) {
  a.push(i);
}

const ms = +new Date() - start;
const mhz = ((COUNT / (ms / 1000)) / 1e6).toFixed(2);
const million = COUNT / 1e6;

// Can't use console.log() since since I also test this in ancient node versions
util.log(`${mhz} Mhz (${million} million in ${ms} ms)`);
