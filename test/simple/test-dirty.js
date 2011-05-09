require('../common');
var Dirty = require('dirty'),
    EventEmitter = require('events').EventEmitter,
    dirtyLoad = Dirty.prototype._load,
    gently,
    dirty;

(function testConstructor() {
  var gently = new Gently();

  (function testBasic() {
    var PATH = '/foo/bar';
    Dirty.prototype._load = gently.expect(function() {
      assert.equal(this.path, PATH);
    });
    var dirty = new Dirty(PATH);

    assert.ok(dirty instanceof EventEmitter);
    assert.deepEqual(dirty._docs, {});
    assert.deepEqual(dirty._queue, []);
    assert.strictEqual(dirty.writeBundle, 1000);
    assert.strictEqual(dirty._writeStream, null);
    assert.strictEqual(dirty._readStream, null);
  })();

  (function testWithoutNew() {
    Dirty.prototype._load = gently.expect(function() {});
    var dirty = Dirty();
  })();

  (function testOldSchoolClassName() {
    assert.strictEqual(Dirty, Dirty.Dirty);
  })();

  Dirty.prototype._load = function(){};
  gently.verify();
})();

function test(fn) {
  gently = new Gently();
  dirty = Dirty();
  fn();
  gently.verify();
}

test(function _load() {
  (function testNoPath() {
    gently.expect(HIJACKED.fs, 'createWriteStream', 0);
    dirtyLoad.call(dirty);
  })();

  (function testWithPath() {
    var PATH = dirty.path = '/dirty.db',
        READ_STREAM = {},
        WRITE_STREAM = {},
        readStreamEmit = {};

    gently.expect(HIJACKED.fs, 'createReadStream', function (path, options) {
      assert.equal(path, PATH);
      assert.equal(options.flags, 'r');
      assert.equal(options.encoding, 'utf-8');

      return READ_STREAM;
    });

    var EVENTS = ['error', 'data', 'end'];
    gently.expect(READ_STREAM, 'on', EVENTS.length, function (event, cb) {
      assert.strictEqual(event, EVENTS.shift());
      readStreamEmit[event] = cb;
      return this;
    });

    gently.expect(HIJACKED.fs, 'createWriteStream', function (path, options) {
      assert.equal(path, PATH);
      assert.equal(options.flags, 'a');
      assert.equal(options.encoding, 'utf-8');

      return WRITE_STREAM;
    });

    gently.expect(WRITE_STREAM, 'on', function (event, cb) {
      assert.strictEqual(event, 'drain');

      (function testQueueEmpty() {
        dirty._queue = [];
        dirty.flushing = true;

        gently.expect(dirty, 'emit', function (event) {
          assert.strictEqual(event, 'drain');
        });

        cb();
        assert.strictEqual(dirty.flushing, false);
      })();

      (function testQueueNotEmpty() {
        dirty._queue = [1];
        dirty.flushing = true;

        gently.expect(dirty, '_maybeFlush');

        cb();
        assert.strictEqual(dirty.flushing, false);
      })();
    });

    dirtyLoad.call(dirty);

    assert.strictEqual(dirty._writeStream, WRITE_STREAM);
    assert.strictEqual(dirty._readStream, READ_STREAM);

    (function testReading() {
      readStreamEmit.data(
        JSON.stringify({key: 1, val: 'A'})+'\n'+
        JSON.stringify({key: 2, val: 'B'})+'\n'
      );

      assert.equal(dirty.get(1), 'A');
      assert.equal(dirty.get(2), 'B');

      readStreamEmit.data('{"key": 3');
      readStreamEmit.data(', "val": "C"}\n');
      assert.equal(dirty.get(3), 'C');

      readStreamEmit.data(
        JSON.stringify({key: 3, val: 'C2'})+'\n'+
        JSON.stringify({key: 4, val: undefined})+'\n'
      );

      gently.expect(dirty, 'emit', function (event, err) {
        assert.equal(event, 'error');
        assert.equal(err.message, 'Could not load corrupted row: {broken');
      });
      readStreamEmit.data('{broken\n');

      gently.expect(dirty, 'emit', function (event, err) {
        assert.equal(event, 'error');
        assert.equal(err.message, 'Could not load corrupted row: {}');
      });
      readStreamEmit.data('{}\n');

      readStreamEmit.data(
        JSON.stringify({key: 1, val: undefined})+'\n'
      );
      assert.ok(!('1' in dirty._docs));
    })();

    (function testReadEnd() {
      gently.expect(dirty, 'emit', function (event, length) {
        assert.equal(event, 'load');
        assert.equal(length, 2);
      });
      readStreamEmit.end();
    })();

    (function testReadEndWithStuffLeftInBuffer() {
      readStreamEmit.data('foo');

      gently.expect(dirty, 'emit', function (event, err) {
        assert.equal(event, 'error');
        assert.equal(err.message, 'Corrupted row at the end of the db: foo');
      });

      gently.expect(dirty, 'emit', function (event) {
        assert.equal(event, 'load');
      });
      readStreamEmit.end();
    })();

    (function testReadDbError() {
      var ERR = new Error('oh oh');
      gently.expect(dirty, 'emit', function (event, err) {
        assert.equal(event, 'error');
        assert.strictEqual(err, ERR);
      });
      readStreamEmit.error(ERR)
    })();

    (function testReadNonexistingDbError() {
      gently.expect(dirty, 'emit', function (event, length) {
        assert.equal(event, 'load');
        assert.equal(length, 0);
      });
      readStreamEmit.error({ code: 'ENOENT' })
    })();
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

  (function testUndefinedActsAsRemove() {
    var KEY = 'example', VAL = undefined;
    gently.expect(dirty, '_maybeFlush');
    dirty.set(KEY, VAL);

    assert.ok(!(KEY in dirty._docs));
  })();
});

test(function _maybeFlush() {
  (function testNothingToFlush() {
    gently.expect(dirty, '_flush', 0);
    dirty._maybeFlush();
  })();

  (function testFlush() {
    dirty.flushing = false;
    dirty.path = '/foo/bar';
    dirty._queue = [1];

    gently.expect(dirty, '_flush');
    dirty._maybeFlush();
  })();

  (function testOneFlushAtATime() {
    dirty.flushing = true;

    gently.expect(dirty, '_flush', 0);
    dirty._maybeFlush();
  })();

  (function testNoFlushingWithoutPath() {
    dirty.flushing = false;
    dirty.path = null;

    gently.expect(dirty, '_flush', 0);
    dirty._maybeFlush();
  })();

  (function testNoFlushingWithoutQueue() {
    dirty.flushing = false;
    dirty.path = '/foo/bar';
    dirty._queue = [];

    gently.expect(dirty, '_flush', 0);
    dirty._maybeFlush();
  })();
});

test(function _flush() {
  var WRITE_STREAM = dirty._writeStream = {}, CB;
  var ERR = new Error('oh oh');

  gently.expect(WRITE_STREAM, 'write', function (str, cb) {
    assert.strictEqual(dirty.flushing, true);
    assert.equal(
      str,
      JSON.stringify({key: 'foo', val: 1})+'\n'+
      JSON.stringify({key: 'bar', val: 2})+'\n'
   );

    cb(ERR);
  });

  var BAR_CB = gently.expect(function writeCb(err) {
    assert.strictEqual(err, ERR);
  });

  var ERR2 = new Error('oh oh');

  gently.expect(WRITE_STREAM, 'write', function (str, cb) {
    assert.equal(str, JSON.stringify({key: 'test', val: 3})+'\n');

    cb(ERR2);
  });

  gently.expect(dirty, 'emit', function (event, err) {
    assert.strictEqual(event, 'error');
    assert.strictEqual(err, ERR2);
  });

  dirty.writeBundle = 2;
  dirty._docs = {foo: 1, bar: 2, test: 3};
  dirty._queue = ['foo', ['bar', BAR_CB], 'test'];

  dirty._flush();

  assert.deepEqual(dirty._queue, []);
});

test(function rm() {
  var KEY = 'foo', CB = function() {};
  gently.expect(dirty, 'set', function (key, val, cb) {
    assert.strictEqual(key, KEY);
    assert.strictEqual(val, undefined);
    assert.strictEqual(cb, CB);
  });
  dirty.rm(KEY, CB);
});

test(function forEach() {
  for (var i = 1; i <= 4; i++) {
    dirty.set(i, {});
  };

  var i = 0;
  dirty.forEach(function(key, doc) {
    i++;
    assert.equal(key, i);
    assert.strictEqual(doc, dirty._docs[i]);

    if (i == 3) {
      return false;
    }
  });

  assert.equal(i, 3);
});
