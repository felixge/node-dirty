process.mixin(require('./common'));

var
  FILE = path.join(path.dirname(__filename), 'dirty.dirty'),
  EXPECTED_FLUSHES = 2,

  db = new Dirty(FILE, {flushInterval: 10}),
  testKey = 'my-key',
  testDoc = {hello: 'world'},
  testDoc2 = {another: "doc"},
  r,

  timesFLushed = 0,
  didSetCallback = false,
  didAddCallback = false,
  didCloseCallback = false;

db.set(testKey, testDoc, function(doc) {
  didSetCallback = true;
  assert.strictEqual(testDoc, doc);
});
assert.equal(testKey, testDoc._key);

r = db.get(testKey);
assert.strictEqual(r, testDoc);

r = db.add(testDoc2, function(doc) {
  didAddCallback = true;
  assert.strictEqual(testDoc2, doc);
});
assert.equal(testDoc2, db.get(r));
assert.equal(2, db.length);

r = db.filter(function(doc) {
  return ('another' in doc);
});
assert.deepEqual(r, [testDoc2]);
assert.strictEqual(r[0], testDoc2);

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
      JSON.stringify(testDoc)+"\n"+
      JSON.stringify(testDoc2)+"\n";

    assert.equal(expected, data);

    db.add({third: 'doc'});
  });
});

process.addListener('exit', function() {
  assert.equal(EXPECTED_FLUSHES, timesFLushed);
  assert.ok(didSetCallback);
  assert.ok(didAddCallback);
  assert.ok(didCloseCallback);

  puts('[done]');
});