process.mixin(require('./common'));

var
  db = new Dirty(),

  expectedCallbacks = {
    a1: 1,
    a2: 1,
  };

db.set('foo', {}, function() {
  expectedCallbacks.a1--;

  db.set('bar', {}, function() {
    expectedCallbacks.a2--;
    assert.ok(!db.get('foo'));
  });
});

assert.ok(db.get('foo'));
db.remove('foo');

process.addListener('exit', function() {
  for (var name in expectedCallbacks) {
    var count = expectedCallbacks[name];

    assert.equal(
      0,
      count,
      'Callback '+name+' fire count off by: '+count
    );
  }
});