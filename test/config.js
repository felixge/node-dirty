var path = require('path'),
  fs = require('fs')

var TMP_PATH = path.join(__dirname, 'tmp'),
  LIB_DIRTY = path.join(__dirname, '../lib/dirty');

fs.rmSync(TMP_PATH, { recursive: true, force: true });
fs.mkdirSync(TMP_PATH);

module.exports = {
  TMP_PATH: TMP_PATH,
  LIB_DIRTY: LIB_DIRTY
};
