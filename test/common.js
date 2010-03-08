process.mixin(require('sys'));

[
  'fs',
  'path',
  'assert',
].forEach(function(module) {
  GLOBAL[module] = require(module);
});

GLOBAL.Dirty = require('../lib/dirty').Dirty;