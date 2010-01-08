process.mixin(require('./common'));

var
  db = new Dirty('set-test', {flushInterval: 10}),
  testKey = 'my-key',
  testDoc = {hello: 'world'},
  testDoc2 = {another: "doc"},
  r,

  didCallback = false;

db.set(testKey, testDoc, function() {
  didCallback = true;
});
assert.equal(testKey, testDoc._key);

r = db.get(testKey);
assert.strictEqual(r, testDoc);

r = db.add(testDoc2);
assert.equal(testDoc2, db.get(r));
assert.equal(2, db.length);

r = db.filter(function(doc) {
  return ('another' in doc);
});
assert.deepEqual(r, [testDoc2]);
assert.strictEqual(r[0], testDoc2);

db.addListener('flush', function() {
  db.close();
});

process.addListener('exit', function() {
  assert.ok(didCallback);
});