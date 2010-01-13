process.mixin(require('./common'));

var
  FILE = path.join(path.dirname(__filename), 'remove.dirty'),

  TEST_KEY = 'my-key',
  TEST_DOC = {hello: 'world'},
  TEST_DOC2 = {another: 'test doc'},

  db = new Dirty(FILE),

  didRemoveCallback = false;;

db.set(TEST_KEY, TEST_DOC);
assert.ok(db.get(TEST_KEY));
assert.equal(1, db.length);

db.remove(TEST_KEY, function() {
  didRemoveCallback = true;

  assert.strictEqual(undefined, db.get(TEST_KEY));
  assert.equal(1, db.length);
});
db.add(TEST_DOC2);
assert.strictEqual(undefined, db.get(TEST_KEY));
assert.equal(1, db.length);

db.addListener('flush', function() {
  posix.cat(FILE).addCallback(function(data) {
    posix.unlink(FILE).addCallback(function() {
      var expected =
        JSON.stringify({_deleted: true, _key: TEST_KEY})+"\n"+
        JSON.stringify(TEST_DOC2)+"\n";

      assert.equal(expected, data);
    });

  });
});

process.addListener('exit', function() {
  assert.ok(didRemoveCallback);
});