process.mixin(require('./common'));

var
  FILE = __dirname+'/set-test.dirty',
  db = new Dirty(FILE),
  callbacks = {
    set: -10,
  };

db
  .addListener('error', function(err) {
    throw err;
  });

for (var i = 0; i < i)
db.set('key', 'value', function(e) {
  callbacks.set++;
  assert.equal(null, e);
});
assert.equal('value', db.docs['key']);

process.addListener('exit', function() {
  for (var k in callbacks) {
    assert.equal(0, callbacks[k], k+' count off by '+callbacks[k]);
  }
});