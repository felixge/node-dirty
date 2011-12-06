require('../../test/common');
var COUNT = 1e4,
    DB_FILE = __dirname+'/../../test/tmp/benchmark-set-drain.dirty',
    dirty = require('dirty')(DB_FILE),
    util = require('util'),
    loaded = false;

for (var i = 0; i < COUNT; i++) {
  dirty.set(i, i);
}

dirty.on('drain', function() {
  var start = +new Date;
  require('dirty')(DB_FILE).on('load', function(length) {
    var ms = +new Date - start,
        mhz = ((COUNT / (ms / 1000)) / 1e3).toFixed(2),
        million = COUNT / 1e6;

    // Can't use console.log() since since I also test this in ancient node versions
    util.log(mhz+' Hz ('+million+' million in '+ms+' ms)');

    loaded = true;

    assert.equal(length, COUNT);
  });
});

process.on('exit', function() {
  assert.ok(loaded);
});
