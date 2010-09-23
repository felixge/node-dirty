require('../common');
var Dirty = require('dirty'),
    dirtyLoad = Dirty.prototype.load,
    gently,
    dirty;

(function testConstructor() {
  var gently = new Gently();

  (function testBasic() {
    var PATH = '/foo/bar';
    Dirty.prototype.load = gently.expect(function() {
      assert.equal(this.path, PATH);
    });
    var dirty = new Dirty(PATH);

    assert.deepEqual(dirty._docs, {});
  })();

  (function testWithoutNew() {
    Dirty.prototype.load = gently.expect(function() {});
    var dirty = Dirty();
  })();

  (function testOldSchoolClassName() {
    assert.strictEqual(Dirty, Dirty.Dirty);
  })();

  Dirty.prototype.load = function(){};
  gently.verify();
})();

function test(fn) {
  gently = new Gently();
  dirty = Dirty();
  fn();
  gently.verify();
}

test(function load() {
  dirtyLoad();
});

test(function set() {
  var KEY = 'example', VAL = {};
  dirty.set(KEY, VAL);
  assert.strictEqual(dirty._docs[KEY], VAL);
});

test(function get() {
  var KEY = 'example', VAL = {};
  dirty._docs[KEY] = VAL;

  assert.strictEqual(dirty.get(KEY), VAL);
});
