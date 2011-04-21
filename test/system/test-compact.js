require('../common');
var DB_FILE = TEST_TMP+'/flush.dirty';
    db = require('dirty')(DB_FILE),
    fs = require('fs');

db.addCompactingFilter(function(key, val){
    return /magic/.test(val);
});

db.addCompactingFilter(function(key, val){
    return key == 'flan';
});

db.on('load', function(){
    db.set('red', 'lightning Bolt');
    db.set('black', 'dark ritual');
    db.set('blue', 'ancestral recall');
    db.set('white', 'healing salve');
    db.set('green', 'llanowar Elves');
    db.set('purple', 'some magic');
    db.set('flan', 'is good');
    assert.equal(7, db.length);
    assert.equal(0, db.redundantLength);
    db.on('drain', function(){
        db.set('green', 'llanowar Elves');
        db.set('green', 'giant growth');
        db.rm('red');
        db.rm('red');
        assert.equal(5, db.redundantLength);
        db.set('red', 'lightning bolt')
        assert.equal(7, db.length);
        assert.equal(5, db.redundantLength);
        db.compact();
        db.on('compacted', function(){
            assert.strictEqual(
              fs.readFileSync(DB_FILE, 'utf-8'),
              JSON.stringify({key: 'black', 'val': 'dark ritual'})+'\n'+ 
              JSON.stringify({key: 'blue', 'val': 'ancestral recall'})+'\n'+ 
              JSON.stringify({key: 'white', 'val': 'healing salve'})+'\n'+ 
              JSON.stringify({key: 'green', 'val': 'giant growth'})+'\n'+
              JSON.stringify({key: 'red', 'val': 'lightning bolt'})+'\n' 
            );
            assert.equal(5, db.length);
            assert.equal(0, db.redundantLength);
        });
    });  
});