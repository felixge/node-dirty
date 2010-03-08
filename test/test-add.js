process.mixin(require('./common'));

var
  FILE = __dirname+'/add-test.dirty',

  db = new Dirty(FILE),
  callbacks = {
    add: -1,
  };

db
  .addListener('error', function(err) {
    throw err;
  });


var uuid = db.add('my value', function() {
  callbacks.add++;
});
assert.equal(32, uuid.length);
assert.equal('my value', db.get(uuid));

process.addListener('exit', function() {
  for (var k in callbacks) {
    assert.equal(0, callbacks[k], k+' count off by '+callbacks[k]);
  }
});