var sys = require('sys')
  , path = require('path');

global.puts = sys.puts;
global.p = sys.p;

require.paths.unshift(path.dirname(__dirname)+'/lib');

[ 'fs'
, 'path'
, 'assert'
].forEach(function(module) {
  global[module] = require(module);
});

global.Dirty = require('../lib/dirty').Dirty;

fs.readdirSync(__dirname).forEach(function(file) {
  if (file.match(/\.dirty$/)) {
    fs.unlinkSync(path.join(__dirname, file));
  }
});

assert.callbacks = function(callbacks) {
  process.addListener('exit', function() {
    for (var k in callbacks) {
      assert.equal
        ( 0
        , callbacks[k]
        , (timeout || '')+k+' count off by '+callbacks[k]
        );
    }
  });
};

assert.properties = function(obj, properties) {
  properties.forEach(function(property) {
    assert.ok(property in obj, 'has property: '+property);
  });

  for (var property in obj) {
    if (!obj.hasOwnProperty(property)) {
      continue;
    }

    if (typeof obj[property] == 'function') {
      continue;
    }

    assert.ok
      ( properties.indexOf(property) > -1
      , 'does not have property: '+property
      );
  }
};