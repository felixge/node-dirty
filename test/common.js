sys = require('sys');

[
  'fs',
  'path',
  'assert',
].forEach(function(module) {
  GLOBAL[module] = require(module);
});

GLOBAL.Dirty = require('../lib/dirty').Dirty;

fs.readdirSync(__dirname).forEach(function(file) {
  if (file.match(/\.dirty$/)) {
    fs.unlinkSync(path.join(__dirname, file));
  }
});