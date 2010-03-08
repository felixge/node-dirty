process.mixin(require('./common'));

var
  FILE = path.join(path.dirname(__filename), 'update.dirty'),

  TEST_ID = 'my-id',
  TEST_DOC = {hello: 'world'},

  db = new Dirty(FILE),

  didRemoveCallback = false;;
  
db.set(TEST_ID, TEST_DOC);

var updatedDoc = process.mixin({foo: 'bar'}, TEST_DOC);
db.set(TEST_ID, updatedDoc);
assert.equal(1, db.length);

assert.strictEqual(updatedDoc, db.get(TEST_ID));

db.addListener('flush', function() {
  posix.unlink(FILE);
});