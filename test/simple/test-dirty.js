require('../common');
var Dirty = require('dirty'),
    EventEmitter = require('events').EventEmitter,
    dirtyLoad = Dirty.prototype._load,
    gently,
    dirty;
process.setMaxListeners(20);    

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
    
    gently.expect(dirty, '_recreateWriteStream');

    dirtyLoad.call(dirty);

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
      readStreamEmit.error({code: 'ENOENT'})
    })();
  })();
});

test(function _recreateWriteStream(){
    var WRITE_STREAM = {};
    var PATH = 'foo/bar.baz';
    dirty.path = PATH; 
    
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
    dirty._recreateWriteStream();
    assert.strictEqual(dirty._writeStream, WRITE_STREAM);
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
  function setup() {
      dirty.compacting = false;
      dirty.flushing = false;
      dirty.path = '/foo/bar';
      dirty._queue = [1];
  }    
    
  (function testNothingToFlush() {
    gently.expect(dirty, '_flush', 0);
    dirty._maybeFlush();
  })();

  (function testFlush() {
    setup();
    gently.expect(dirty, '_flush');
    dirty._maybeFlush();
  })();

  (function testOneFlushAtATime() {
    setup();
    dirty.flushing = true;
    gently.expect(dirty, '_flush', 0);
    dirty._maybeFlush();
  })();

  (function testNoFlushingWithoutPath() {
    setup();
    dirty.path = null;

    gently.expect(dirty, '_flush', 0);
    dirty._maybeFlush();
  })();

  (function testNoFlushingWithoutQueue() {
    setup();
    dirty._queue = [];

    gently.expect(dirty, '_flush', 0);
    dirty._maybeFlush();
  })();
  
  (function testNoFlushingWhileCompacting() {
      setup();
      dirty.compacting = true;
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

test(function compactPath(){
    (function testIsPathAppendedWithCompact(){
        dirty.path = 'foo/bar.baz';
        assert.strictEqual('foo/bar.baz.compact', dirty._compactPath);
    })();
});

test(function compact() {
        var setup = function() {
        dirty.compacting = false;
        dirty.flushing = false;
        dirty._writeStream = {};
    };
    
    (function testSetsCompactingAndStartsCompacting(){
        setup();
        gently.expect(dirty,'_startCompacting');
        dirty.compact();
        assert.strictEqual(true, dirty.compacting);
    })();
    
    (function testDoesntDoAnythingWhenAlreadyCompacting() {
        setup();
        dirty.compacting = true;
        gently.expect(dirty, '_startCompacting', 0);
        dirty.compact();
    })();
    
    (function whenFlushing(oldSetup) {
        var setup = function() {
            oldSetup();
            dirty.flushing = true;
        };
        (function testDoesntStart() {
            setup();
            gently.expect(dirty._writeStream, "once");
            gently.expect(dirty, '_startCompacting', 0);
            dirty.compact();
        })();
        
        (function testSetsCompactingToTrue(){
            setup();
            gently.expect(dirty._writeStream, "once");
            dirty.compact();
            assert.strictEqual(true, dirty.compacting);
        })();
        
        (function testSignsUpForASingleDrainOnWritestream() {
            setup();
            gently.expect(dirty._writeStream, "once", function(a,b){
                assert.strictEqual("drain", a);
            })
            dirty.compact();
        })();
        
        (function testStartsCompactingOnceDrainIsEmitted(){
            setup();
            gently.expect(dirty._writeStream, "once", function(a,b){
                gently.expect(dirty, "_startCompacting");
                b();
            });
            dirty.compact();
        })();
    })(setup);
});

test(function _startCompacting(){
    var ws = {};
    function expectWriteStream(){
        dirty.path = 'foo/bar.baz';
        gently.expect(HIJACKED.fs, "createWriteStream", function(path, obj){
            assert.strictEqual("foo/bar.baz.compact", path);
            assert.strictEqual('utf-8', obj.encoding);
            assert.strictEqual('w', obj.flags);
            return ws;
        });
    };
    function setup(){
        expectWriteStream();
        gently.expect(ws, "on", 2);
        gently.expect(dirty, '_writeCompactedData');
    };
   (function testBacksUpAndEmptiesTheQueue(){
       setup();
       dirty._queue = [1,2,3];
       dirty._queueBackup = ["hi", "hello"];
       dirty._startCompacting();
       assert.deepEqual([], dirty._queue);
       assert.deepEqual([1,2,3], dirty._queueBackup); 
   })();
   
   (function testCreatesAWriteStreamToACompactFile(){
       setup();
       dirty._startCompacting();
   })();
   
   (function testEmitsCompactingFailedOnWriteError(){
       expectWriteStream();
       gently.expect(ws, 'on', function(type, cb){
           assert.strictEqual('error', type);
           gently.expect(dirty, 'emit', function(evt){
               assert.strictEqual('compactingError', evt);
           });
           cb();
           gently.expect(ws, 'on');
           gently.expect(dirty, '_writeCompactedData');           
       });
       dirty._startCompacting();
   })();
   
   (function testRenamesCompactFileToOriginalOnDrain(){
       expectWriteStream();
       gently.expect(ws, 'on');
       gently.expect(ws, 'on', function(type, cb){
           assert.strictEqual('drain', type);
           gently.expect(dirty, "_moveCompactedDataOverOriginal");
           cb();
           gently.expect(dirty,'_writeCompactedData');
       })
       dirty._startCompacting();
   })();
   
   (function testPassesWriteStreamToWriteCompactedData(){
       expectWriteStream();
       gently.expect(ws, 'on',2);
       gently.expect(dirty, '_writeCompactedData', function(obj){
           assert.strictEqual(ws, obj);
       });
       dirty._startCompacting();
   })();
});

test(function _moveCompactedDataOverOriginal() {
   (function testRenamesCompactedFileToOriginal(){
       dirty.path = 'foo/bar.baz'
       gently.expect(HIJACKED.fs, 'rename', function(src, dst){
           assert.strictEqual('foo/bar.baz.compact', src);
           assert.strictEqual('foo/bar.baz', dst);
       });
       dirty._moveCompactedDataOverOriginal();
   })();
   
   (function testEmitsCompactingFailedIfRenameErrorsOut(){
       gently.expect(HIJACKED.fs, 'rename', function(a,b,cb){
           gently.expect(dirty, '_recreateWriteStream');
           gently.expect(dirty, 'emit', function(evt){
               assert.strictEqual('compactingError', evt);
           });
          cb(new Error('')); 
       });
       dirty._moveCompactedDataOverOriginal();
   })(); 

   (function testEmitsCompactedIfRenameErrorsOut(){
       gently.expect(HIJACKED.fs, 'rename', function(a,b,cb){
           gently.expect(dirty, '_recreateWriteStream');
           gently.expect(dirty, 'emit', function(evt){
               assert.strictEqual('compacted', evt);
           });
          cb(); 
       });
       dirty._moveCompactedDataOverOriginal();
   })(); 
});

var _onCompactingComplete = function (evt){
    (function testEmptiesTheBackupQueue(){
        dirty._queueBackup = [1,2,3];
        gently.expect(dirty, "_maybeFlush");
        evt(); 
        assert.deepEqual([],dirty._queueBackup);
    })();
    
    (function testSetsCompactingToFalse(){
        dirty._queueBackup = [1,2,3];
        gently.expect(dirty, "_maybeFlush");
        evt();
        assert.strictEqual(false, dirty.compacting);        
    })();
}

test(function _onCompactedResetsTheState(){
    _onCompactingComplete(function(){
        dirty.emit("compacted");
    });
});
 
test(function _onCompactingErrorResetsTheStateToBeforeCompacting(){
    (function testPrependsTheBackupQueueToTheQueue(){
        dirty._queueBackup = ["tap", "2R"];
        dirty._queue = ["destroy", "one", "land"];        
        dirty.emit('compactingError');
        assert.deepEqual(["tap", "2R", "destroy", "one", "land"], dirty._queue);
    })();
    
    _onCompactingComplete(function(){
        dirty.emit('compactingError');
    });
});

test(function Indexes(){
    (function setup() {
        dirty.addIndex('race', function(k,v){
            return v.race;
        });
        dirty.addIndex('damageType', function(k,v){
            return v.damageType; 
        });
    })();
    
    var eva = {race: 'cra', damageType: 'ranged', sex: 'F'};
    var ama = {race: 'sadida', damageType: 'ranged', sex: 'F'};
    var yug = {race: 'eliatrope', set: 'M'};

    (function testSearchingForANonExistingElementReturnsNothing(){
        assert.deepEqual([], dirty.find('race', 'cra'));
    })();
    
    (function testAddingASingleElementMakesItSearchableByIndex(){
        dirty.set('Evangelyne', eva);
        assert.deepEqual([{key: 'Evangelyne', val: eva}], dirty.find('race', 'cra')); 
    })();
    
    (function testSearchingForAnItemWhichMatchesNOIndexesReturnsNothing(){
        assert.deepEqual([], dirty.find('race', 'sadida'));
    })();
    
    (function testSearchingForAnItemThatIsDeletedReturnsNothing(){
        dirty.rm('Evangelyne');
        assert.deepEqual([], dirty.find('race', 'cra'));
    })();
    
    (function testSearchingForSomethingThatMatchesMoreThanOneItemReturnsThemAll(){
        dirty.set('Evangelyne', eva);
        dirty.set('Amalia', eva);
        assert.deepEqual([{key: 'Evangelyne', val: eva}, {key: 'Amalia', val: eva}], dirty.find('race', 'cra'));
        assert.deepEqual([{key: 'Evangelyne', val: eva}, {key: 'Amalia', val: eva}], dirty.find('damageType', 'ranged'));
    })();
    
    (function testSearchingAfterModificationReturnsTheSameItemIfTheIndexValueHasntChanged(){
        dirty.set('Amalia', ama);
        assert.deepEqual([{key: 'Evangelyne', val: eva}, {key: 'Amalia', val: ama}], dirty.find('damageType', 'ranged'));
    })();

    (function testSearchingAfterModificationReturnsUnderTheNewIndex(){
        assert.deepEqual([{key: 'Evangelyne', val: eva}], dirty.find('race', 'cra'));
        assert.deepEqual([{key: 'Amalia', val: ama}], dirty.find('race', 'sadida'));
    })();
});

test(function length(){
    (function setup(){
        dirty.forEach(function(k,v){
            dirty.rm(k);
        })
        assert.equal(0, dirty.length);
    })();
    
    (function testAddingAnItemIncreasesLength(){
       dirty.set('steam',['fire', 'ice']);
       assert.equal(1, dirty.length); 
    })();
    
    (function testModifyingAnItemDoesntChangeLength(){
        dirty.set('steam', ['fire', 'water']);
        assert.equal(1, dirty.length);
    })();
    
    (function testRemovingAnItemReducesLength(){
        dirty.rm('steam');
        assert.equal(0, dirty.length);
    })();
    
    (function testReAddingADeletedItemIncreasesLength(){
        dirty.set('steam', ['fire', 'water']);
        assert.equal(1, dirty.length);
    })();
    
    (function testReAddingAnExistingItemDoesNotIncreaseLength(){
        dirty.set('steam', ['fire', 'water']);
        assert.equal(1, dirty.length);
    })();
})

test(function redundantLength(){
    var original_length;
    (function setup(){
        dirty.forEach(function(k,v){
            dirty.rm(k);
        })
        original_length = dirty.redundantLength;
    })();
    
    (function testAddingAnItemDoesNotIncreaseRedundantLength(){
       dirty.set('arcane','spread');
       assert.equal(original_length, dirty.redundantLength); 
    })();
    
    (function testReAddingAnExistingItemIncreasesRedundantLength(){
       dirty.set('arcane','spread');
       assert.equal(original_length + 1, dirty.redundantLength); 
    })();
    
    (function testModifyingAnItemIncreasesRedundantLength(){
        dirty.set('arcane', 'beam');
        assert.equal(original_length + 2, dirty.redundantLength);
    })();
    
    (function testRemovingAnExistingItemIncreasesRedundantLengthByTwo(){
        dirty.rm('arcane');
        assert.equal(original_length + 4, dirty.redundantLength);
    })();
    
    (function testRemovingANonExistingItemIncreasesRedundantLength(){
        dirty.rm('arcane');
        assert.equal(original_length + 5, dirty.redundantLength);
    })();
    
    (function testReAddingADeletedItemDoesNotIncreasRedundantLength(){
        dirty.set('arcane', 'beam');
        assert.equal(original_length + 5, dirty.redundantLength);
    })();
})

