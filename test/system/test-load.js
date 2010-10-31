require('../common');
var DB_FILE = TEST_TMP+'/load.dirty';
    db = require('dirty')(DB_FILE),
    fs = require('fs'),
    loaded = false;

db.set(1, 'A');
db.set(2, 'B');
db.set(3, 'C');
db.rm(3);

db.on('drain', function() {
  var db2 = require('dirty')(DB_FILE);
  db2.on('load', function(length) {
    loaded = true;

    assert.equal(length, 2);

    assert.strictEqual(db2.get(1), 'A');
    assert.strictEqual(db2.get(2), 'B');
    assert.strictEqual(db2.get(3), undefined);
    assert.strictEqual(db2._keys.length, 2);
    assert.ok(!('3' in db2._docs));
  });
});

process.on('exit', function() {
  assert.ok(loaded);
});
