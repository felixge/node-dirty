var COUNT = 1e6,
    o = {};

var start = +new Date;
for (var i = 0; i < COUNT; i++) {
  o[i] = i;
}

var ms = +new Date - start,
    mhz = (COUNT / (ms / 1000)) / 1e6,
    million = COUNT / 1e6;

console.log('%d Mhz (%d million in %d ms)', mhz.toFixed(2), million, ms);
