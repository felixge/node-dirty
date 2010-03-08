process.mixin(require('./common'));

var
  FILE = __dirname+'/load.dirty',

  db = new Dirty(FILE, {flushLimit: 1}),
  db2,

  callbacks = {
    load: -1,
  };

db
  .addListener('error', function(err) {
    throw err;
  });

db.set('a', 1);
db.set('b', 2);
db.remove('b');

db.addListener('drain', function() {
  db2 = new Dirty(FILE);
  db2.addListener('load', function() {
    callbacks.load++;

    assert.equal(1, db2.get('a'));
    assert.equal(undefined, db2.get('b'));
  });
});

process.addListener('exit', function() {
  for (var k in callbacks) {
    assert.equal(0, callbacks[k], k+' count off by '+callbacks[k]);
  }
});