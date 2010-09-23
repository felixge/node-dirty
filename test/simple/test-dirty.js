require('../common');
var Dirty = require('dirty'),
    EventEmitter = require('events').EventEmitter,
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

    assert.ok(dirty instanceof EventEmitter);
    assert.deepEqual(dirty._docs, {});
    assert.deepEqual(dirty._queue, []);
    assert.deepEqual(dirty.flushLimit, 1000);
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
  (function testNoPath() {
    gently.expect(HIJACKED.fs, 'createWriteStream', 0);
    dirtyLoad.call(dirty);
  })();

  (function testWithPath() {
    var PATH = dirty.path = '/dirty.db',
        WRITE_STREAM = {};

    gently.expect(HIJACKED.fs, 'createWriteStream', function (path, options) {
      assert.equal(path, PATH);
      assert.equal(options.encoding, 'utf-8');
      return WRITE_STREAM;
    });
    dirtyLoad.call(dirty);

    assert.strictEqual(dirty.writeStream, WRITE_STREAM);
  })();
});

test(function get() {
  var KEY = 'example', VAL = {};
  dirty._docs[KEY] = VAL;

  assert.strictEqual(dirty.get(KEY), VAL);
});

test(function set() {
  (function testNoCallback() {
    var KEY = 'example', VAL = {};
    gently.expect(dirty, '_maybeFlush');
    dirty.set(KEY, VAL);
    assert.strictEqual(dirty._docs[KEY], VAL);
    assert.strictEqual(dirty._queue[0], KEY);
  })();

  (function testCallback() {
    var KEY = 'example', VAL = {}, CB = function() {};
    gently.expect(dirty, '_maybeFlush');
    dirty.set(KEY, VAL, CB);
    assert.strictEqual(dirty._queue[1][0], KEY);
    assert.strictEqual(dirty._queue[1][1], CB);
  })();
});

test(function _maybeFlush() {
  (function testNothingToFlush() {
    gently.expect(dirty, 'flush', 0);
    dirty._maybeFlush();
  })();

  (function testFlush() {
    dirty.path = '/foo/bar';
    dirty.flushLimit = 1;
    dirty._queue = [1];

    gently.expect(dirty, 'flush');
    dirty._maybeFlush();
  })();

  (function testOneFlushAtATime() {
    dirty.flushing = true;

    gently.expect(dirty, 'flush', 0);
    dirty._maybeFlush();
  })();

  (function testNoFlushingWithoutPath() {
    dirty.flushing = false;
    dirty.path = null;

    gently.expect(dirty, 'flush', 0);
    dirty._maybeFlush();
  })();
});

test(function flush() {
  dirty.flush();
});
