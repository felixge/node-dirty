process.mixin(require('./common'));

var
  FILE = path.join(path.dirname(__filename), 'remove.dirty'),

  TEST_ID = 'my-id',
  TEST_DOC = {hello: 'world'},
  TEST_DOC2 = {another: 'test doc'},

  db = new Dirty(FILE),

  didRemoveCallback = false,

  r;

db.set(TEST_ID, TEST_DOC);
assert.ok(db.get(TEST_ID));
assert.equal(1, db.length);

db.remove(TEST_ID, function() {
  didRemoveCallback = true;

  assert.strictEqual(undefined, db.get(TEST_ID));
  assert.equal(1, db.length);

  r = 0;
  db.filter(function(doc) {
    assert.ok(!('hello' in doc));
    r++;
  });
  assert.equal(1, r);
});

assert.equal(0, db.length);

r = 0;
db.filter(function(doc) {
  assert.ok(!('hello' in doc));
  r++;
});
assert.equal(1, r);

db.add(TEST_DOC2);
assert.strictEqual(undefined, db.get(TEST_ID));
assert.equal(1, db.length);

db.addListener('flush', function() {
  posix.cat(FILE).addCallback(function(data) {
    posix.unlink(FILE).addCallback(function() {
      var expected =
        JSON.stringify({_deleted: true, _id: TEST_ID})+"\n"+
        JSON.stringify(TEST_DOC2)+"\n";

      assert.equal(expected, data);
    });

  });
});

process.addListener('exit', function() {
  assert.ok(didRemoveCallback);
});