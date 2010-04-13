require('./common');

var
  FILE = __dirname+'/set.dirty',
  CREATE_DOCS = 10,

  db = new Dirty(FILE),
  callbacks = {
    set: -CREATE_DOCS,
    drain: -1,
  };

db
  .addListener('error', function(err) {
    throw err;
  });

for (var i = 0; i < CREATE_DOCS; i++) {
  db.set('key-'+i, 'val-'+i, function(e) {
    callbacks.set++;
    assert.equal(null, e);
  });
  assert.equal('val-'+i, db.get('key-'+i));
}

db.addListener('drain', function() {
  callbacks.drain++;

  var docCount = 0;

  fs.readFileSync(FILE)
    .split("\n")
    .slice(0, -1)
    .forEach(function(chunk) {
      var doc = JSON.parse(chunk);
      assert.equal(db.get(doc.id), doc.value);

      docCount++;
    });

  assert.equal(CREATE_DOCS, docCount);
});


process.addListener('exit', function() {
  for (var k in callbacks) {
    assert.equal(0, callbacks[k], k+' count off by '+callbacks[k]);
  }
});