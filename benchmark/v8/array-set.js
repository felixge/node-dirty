var COUNT = 1e6,
    sys = require('sys'),
    a = [];

var start = +new Date;
for (var i = 0; i < COUNT; i++) {
  a[i] = i;
}

var ms = +new Date - start,
    mhz = ((COUNT / (ms / 1000)) / 1e6).toFixed(2),
    million = COUNT / 1e6;

// Can't use console.log() since since I also test this in ancient node versions
sys.puts(mhz+' Mhz ('+million+' million in '+ms+' ms)');
