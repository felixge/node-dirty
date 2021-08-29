const COUNT = 1e7;
const util = require('util');
const a = [];

for (let i = 0; i < COUNT; i++) {
  a.push(i);
}

const start = +new Date();
a.filter((val, i) => {
  if (val !== i) {
    throw new Error('implementation fail');
  }
});

const ms = +new Date() - start;
const mhz = ((COUNT / (ms / 1000)) / 1e6).toFixed(2);
const million = COUNT / 1e6;

// Can't use console.log() since since I also test this in ancient node versions
util.log(`${mhz} Mhz (${million} million in ${ms} ms)`);
