process.mixin(require('./common'));

var
  db = new Dirty('set-test'),
  testKey = 'my-key',
  testDoc = {hello: 'world'},
  testDoc2 = {another: "doc"},
  r;

db.set(testKey, testDoc);
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