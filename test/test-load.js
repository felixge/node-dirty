process.mixin(require('./common'));

var
  FILE = path.join(path.dirname(__filename), 'load.dirty'),

  TEST_ID = 'you-get-deleted',
  TEST_DOC = {makesMe: 'sad'},
  TEST_ID2 = 'you-stay',
  TEST_DOC2 = {makeMe: 'happy'},

  db1 = new Dirty(FILE),

  expectLoadedDocs = 1;

db1.set(TEST_ID, TEST_DOC);
db1.set(TEST_ID2, TEST_DOC2);
db1.remove(TEST_ID);

db1.addListener('flush', function() {
  var db2 = new Dirty(FILE);
  db2
    .load()
    .addCallback(function() {
      posix.unlink(FILE);

      db2.filter(function(doc) {
        assert.ok(!doc._deleted);
        assert.deepEqual(TEST_DOC2, doc);
        expectLoadedDocs--;
      });
    });
});

process.addListener('exit', function() {
  assert.equal(0, expectLoadedDocs);
});