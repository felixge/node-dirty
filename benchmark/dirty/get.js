require('../../test/common');
var COUNT = 1e6,
    dirty = require('dirty')(),
    util = require('util');

for (var i = 0; i < COUNT; i++) {
  dirty.set(i, i);
}

var start = +new Date;
for (var i = 0; i < COUNT; i++) {
  if (dirty.get(i) !== i) {
    throw new Error('implementation fail');
  }
}

var ms = +new Date - start,
    mhz = ((COUNT / (ms / 1000)) / 1e6).toFixed(2),
    million = COUNT / 1e6;

// Can't use console.log() since since I also test this in ancient node versions
util.log(mhz+' Mhz ('+million+' million in '+ms+' ms)');

