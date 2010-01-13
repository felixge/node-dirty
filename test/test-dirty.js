process.mixin(require('./common'));

var
  FILE = path.join(path.dirname(__filename), 'dirty.dirty'),
  EXPECTED_FLUSHES = 2,

  TEST_KEY = 'my-key',
  TEST_DOC = {hello: 'world'},
  TEST_DOC2 = {another: "doc"},

  db = new Dirty(FILE, {flushInterval: 10}),

  timesFLushed = 0,
  didSetCallback = false,
  didAddCallback = false,
  didCloseCallback = false,

  r;

db.set(TEST_KEY, TEST_DOC, function(doc) {
  didSetCallback = true;
  assert.strictEqual(TEST_DOC, doc);
});
assert.equal(TEST_KEY, TEST_DOC._key);

r = db.get(TEST_KEY);
assert.strictEqual(r, TEST_DOC);

r = db.add(TEST_DOC2, function(doc) {
  didAddCallback = true;
  assert.strictEqual(TEST_DOC2, doc);
});
assert.equal(TEST_DOC2, db.get(r));
assert.equal(2, db.length);

r = db.filter(function(doc) {
  return ('another' in doc);
});
assert.deepEqual(r, [TEST_DOC2]);
assert.strictEqual(r[0], TEST_DOC2);

db.addListener('flush', function() {
  timesFLushed++;
  if (timesFLushed === EXPECTED_FLUSHES) {
    posix.unlink(FILE);
    db.close().addCallback(function() {
      didCloseCallback = true;
    });
    return;
  }

  posix.cat(FILE).addCallback(function(data) {
    var expected =
      JSON.stringify(TEST_DOC)+"\n"+
      JSON.stringify(TEST_DOC2)+"\n";

    assert.equal(expected, data);

    db.add({third: 'doc'});
  });
});

process.addListener('exit', function() {
  assert.equal(EXPECTED_FLUSHES, timesFLushed);
  assert.ok(didSetCallback);
  assert.ok(didAddCallback);
  assert.ok(didCloseCallback);
});