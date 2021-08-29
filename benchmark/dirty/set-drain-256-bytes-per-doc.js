const config = require('../../test/config');
const Dirty = require(config.LIB_DIRTY);

const COUNT = 1e5;
const dirty = new Dirty(`${config.TMP_PATH}/benchmark-set-drain.dirty`);
const util = require('util');
let drained = false;

const start = Date.now();
for (let i = 0; i < COUNT; i++) {
  dirty.set(i, 'This string has 256 bytes. This string has 256 bytes. This string has 256 bytes. This string has 256 bytes.  This string has 256 bytes. This string has 256 bytes. This string has 256 bytes. This string has 256 bytes.  This string has 256 bytes. This string');
}

dirty.on('drain', () => {
  const ms = Date.now() - start;
  const mhz = ((COUNT / (ms / 1000)) / 1e3).toFixed(2);
  const million = COUNT / 1e6;

  // Can't use console.log() since since I also test this in ancient node versions
  util.log(`${mhz} Hz (${million} million in ${ms} ms)`);

  drained = true;
});

process.on('exit', () => {
  assert.ok(drained);
});
