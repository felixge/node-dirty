process.mixin(require('./common'));

var
  FILE = path.join(path.dirname(__filename), 'flush.dirty'),

  // Only emit flush if we're really in sync with the disc
  EXPECTED_FLUSHES = 1,

  db = new Dirty(FILE, {flushLimit: 2, flushInterval: null}),

  timesFlushed = 0;

db.add({}, function() {
  db.add({});
});
db.add({});
db.add({});

db.addListener('flush', function() {
  timesFlushed++;
  if (timesFlushed == EXPECTED_FLUSHES) {
    posix.unlink(FILE);
  }
});

process.addListener('exit', function() {
  assert.equal(EXPECTED_FLUSHES, timesFlushed);
});