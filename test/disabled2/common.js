var sys = require('sys');
global.puts = sys.puts;
global.p = sys.p;

[
  'fs',
  'path',
  'assert',
].forEach(function(module) {
  global[module] = require(module);
});

global.Dirty = require('../lib/dirty').Dirty;

fs.readdirSync(__dirname).forEach(function(file) {
  if (file.match(/\.dirty$/)) {
    fs.unlinkSync(path.join(__dirname, file));
  }
});