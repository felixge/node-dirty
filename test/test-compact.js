var config = require('./config'),
  path = require('path'),
  fs = require('fs'),
  dirty = require(config.LIB_DIRTY),
  assert = require('assert'),
  db;
var exists = (fs.exists) ? fs.exists : path.exists;
var file = config.TMP_PATH + '/compacttest.dirty';
describe('compacting', function(){
  beforeEach(function(done){
    db = dirty(file);
    db.once('load', function(){
      db.set('red', 'lightning Bolt');
      db.set('black', 'dark ritual');
      db.set('blue', 'ancestral recall');
      db.set('white', 'healing salve');
      db.set('green', 'llanowar Elves');
      db.once('drain', function(){
        done();
      })
    });
  });

  afterEach(function (done) {
    exists(file, function(doesExist) {
      if (doesExist) {
        fs.unlinkSync(file);
      }
    done();
    });
  });

  var assertPristine = function() {
    assert.strictEqual(0, db.redundantLength);
    assert.strictEqual(
      fs.readFileSync(file, 'utf-8'),
      JSON.stringify({key: 'black', 'val': 'dark ritual'})+'\n'+
      JSON.stringify({key: 'blue', 'val': 'ancestral recall'})+'\n'+
      JSON.stringify({key: 'white', 'val': 'healing salve'})+'\n'+
      JSON.stringify({key: 'green', 'val': 'giant growth'})+'\n'+
      JSON.stringify({key: 'red', 'val': 'lightning bolt'})+'\n'
    );
  }

  it('should accurately report length as number of rows', function(done){
    assert.strictEqual(5, db.length);
    done();
  });

  it('should report redundantLength as empty', function(){
    assert.strictEqual(0, db.redundantLength);
  });

  it('should accurately display redundant length', function(done){
    db.set('green', 'llanowar Elves');
    db.set('green', 'giant growth');
    db.rm('red');
    db.rm('red');
    assert.strictEqual(5, db.redundantLength);
    done();
  });

  it('should compact out redundant rows', function(done){
    db.set('green', 'llanowar Elves');
    db.set('green', 'giant growth');
    db.rm('red');
    db.set('red', 'lightning bolt')
    db.once('drain', function(){
      db.compact();
      db.on('compacted', function(){
        assertPristine();
        done();
      })
    });
  });

  it('should compact correctly with a small bundle write limit', function(done){
    db.set('green', 'giant growth');
    db.rm('red');
    db.set('red', 'lightning bolt')
    db.writeBundle = 2;
    db.once('drain', function(){
      db.compact();
      db.once('compacted', function(){
        assertPristine();
        done();
      })
    });
  });

  it('should not compact while flushing', function(done){
    var didFlush = false;
    db.set('green', 'giant growth');
    db.rm('red');
    db.once('drain', function(){
      assert.ok(!db.compacting);
      didFlush = true;
    });
    db.set('red', 'lightning bolt');
    db.compact();
    db.once('compacted', function(){
      assertPristine();
      assert.ok(didFlush);
      done();
    })
  });

  it('should not flush while compacting', function(done){
    db.compact();
    var didCompact = false;
    var listener = function(){
      db._events['compacted'].splice(0,1);
      assert.ok(!db.flushing);
      didCompact = true;
    };
    db._events['compacted'] = [listener, db._events['compacted']];
    db.once('drain', function(){
      assert.ok(didCompact);
      done();
    })
    db.set('red', 'lightning bolt');
  });

  it('should get rid of rows while compacting', function(done){
    db.addCompactingFilter(function(key, val){
      return /magic/.test(val);
    });
    db.set('purple', "it's magic");
    db.set('green', 'giant growth');
    db.rm('red');
    db.set('red', 'lightning bolt')
    assert.strictEqual(6, db.length);
    db.on('drain', function(){
      db.on('compacted', function(){
        assertPristine();
        assert.strictEqual(5, db.length);
        done();
      });
      db.compact();
    });
  });
});
