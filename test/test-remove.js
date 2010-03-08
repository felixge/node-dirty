process.mixin(require('./common'));

var
  FILE = __dirname+'/remove-test.dirty',

  db = new Dirty(FILE),
  callbacks = {
    remove: -1,
    set: -1,
    drain: -1,
  };

db
  .addListener('error', function(err) {
    throw err;
  });

db.set('key', 'val', function() {
  callbacks.set++;
});
db.remove('key', function() {
  callbacks.remove++;

  assert.equal(undefined, db.get('key'));
});

assert.equal(undefined, db.get('key'));

db.addListener('drain', function() {
  callbacks.drain++;

  var chunks = fs.readFileSync(FILE);
  assert.equal(chunks, [
    JSON.stringify({id: 'key', value: 'val'}),
    JSON.stringify({id: 'key', deleted: true}),
  ].join("\n")+"\n");
});

process.addListener('exit', function() {
  for (var k in callbacks) {
    assert.equal(0, callbacks[k], k+' count off by '+callbacks[k]);
  }
});