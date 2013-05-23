var config = require('./config'),
  fs = require('fs'),
  assert = require('assert')
  Set = require(config.LIB_SET);

describe('test-sets', function() {
  it('should be possible to create an empty set', function(){
    assert.ok(new Set().empty());
  })

  it('should be possible to initialize a set from an array', function(){
    var set = new Set(['foo','bar']);
    assert.ok(!set.empty());
    assert.equal(2, set.length);
  });

  it('should not add duplicate elements', function(){
    var set = new Set(['foo', 'bar', 'foo']);
    set.add('foo');
    set.add('bar');
    assert.equal(2, set.length);
  });

  it('should report the existence of elements', function(){
    var set = new Set(['foo', 'bar']);
    assert.ok(set.contains('bar'));
    assert.ok(!set.contains('baz'));
  });

  it('should let you remove elements', function(){
      var set = new Set(['foo', 'bar']);
      set.remove('foo');
      assert.equal(1, set.length);
      assert.ok(!set.contains('foo'));
  });

  it('should provide an array of all items in the set', function(){
    var set = new Set(['foo', 'bar', 'foo']);
    assert.deepEqual(['bar', 'foo'], set.toArray().sort());
  });


  it('should not get confused by properties on the prototype of Object', function(){
      Object.prototype.baz = true;
      var set = new Set(['foo', 'bar']);
      var assertHasBaz = function() {
        assert.equal(3, set.length);
        assert.ok(set.contains('baz'));
        assert.deepEqual(['bar', 'baz', 'foo'], set.toArray().sort());
      }
      var assertHasNoBaz = function() {
        assert.equal(2, set.length);
        assert.ok(!set.contains('baz'));
        assert.deepEqual(['bar', 'foo'], set.toArray().sort());
      }
      assertHasNoBaz();
      set.add('baz');
      assertHasBaz();
      set.remove('baz');
      assertHasNoBaz();
      set.remove('baz');
      assertHasNoBaz();
  });

  it('should return all items that are not present in the given set', function(){
    var set1 = new Set(['foo', 'bar', 'baz']);
    var set2 = new Set(['baz', 'qux', 'quux']);
    assert.deepEqual(['bar', 'foo'], set1.difference(set2).toArray().sort());
    assert.deepEqual(['quux', 'qux'], set2.difference(set1).toArray().sort());
  });

  it('should return all items that are not present in the given set as an array if passed a second parameter (true)', function(){
    var set1 = new Set(['foo', 'bar', 'baz']);
    var set2 = new Set(['baz', 'qux', 'quux']);
    assert.deepEqual(['bar', 'foo'], set1.difference(set2, true).sort());
    assert.deepEqual(['quux', 'qux'], set2.difference(set1, true).sort());
  });
});
