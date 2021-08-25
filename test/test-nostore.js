var config = require('./config'),
  Dirty = require(config.LIB_DIRTY),
  assert = require('assert'),
  fs = require('fs');

describe('test-load-event', function() {
  it('should fire load event', function(done) {
    var db = new Dirty();

    db.on('load', function() {
      done();
    });
  });

});

describe('test-set-callback', function() {

  it ('should trigger callback on set', function(done) {
    var db = new Dirty();
    var foo = '';

    db.set('foo', 'bar', function() {
      foo = db.get('foo');
      assert.equal(foo, 'bar');
      done();
    });

  });

});
