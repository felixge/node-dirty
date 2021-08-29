'use strict';

const COUNT = 1e7;
const a = [];

for (let i = 0; i < COUNT; i++) {
  a.push(i);
}

const start = +new Date();
for (let i = 0; i < COUNT; i++) {
  if (a[i] !== i) {
    throw new Error('implementation fail');
  }
}

const ms = +new Date() - start;
const mhz = ((COUNT / (ms / 1000)) / 1e6).toFixed(2);
const million = COUNT / 1e6;
console.log(`${mhz} Mhz (${million} million in ${ms} ms)`);
