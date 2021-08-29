'use strict';

const COUNT = 1e6;
const o = {};

for (let i = 0; i < COUNT; i++) {
  o[i] = i;
}

const start = +new Date();
for (const i in o) {
  if (o[i] !== i) {
    throw new Error('implementation fail');
  }
}

const ms = +new Date() - start;
const mhz = ((COUNT / (ms / 1000)) / 1e6).toFixed(2);
const million = COUNT / 1e6;
console.log(`${mhz} Mhz (${million} million in ${ms} ms)`);
