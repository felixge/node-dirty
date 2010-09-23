var COUNT = 1e7,
    o = {};

for (var i = 0; i < COUNT; i++) {
  o[i] = i;
}

var start = +new Date;
for (var i = 0; i < COUNT; i++) {
  if (o[i] !== i) {
    throw new Error();
  }
}

var ms = +new Date - start,
    mhz = (COUNT / (ms / 1000)) / 1e6,
    million = COUNT / 1e6;

console.log('%d Mhz (%d million in %d ms)', mhz.toFixed(2), million, ms);
