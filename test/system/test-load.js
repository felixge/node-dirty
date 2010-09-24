require('../common');
var DB_FILE = TEST_TMP+'/load.dirty';
    db = require('dirty')(DB_FILE),
    fs = require('fs'),
    loaded = false;

db.flushLimit = 2;

db.set(1, 'A');
db.set(2, 'B');

db.on('drain', function() {
  var db2 = require('dirty')(DB_FILE);
  db2.on('load', function() {
    loaded = true;

    assert.strictEqual(db2.get(1), 'A');
    assert.strictEqual(db2.get(2), 'B');
  });
});

process.on('exit', function() {
  assert.ok(loaded);
});
