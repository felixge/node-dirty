require('../common');
var DB_FILE = TEST_TMP+'/flush.dirty';
    db = require('dirty')(DB_FILE),
    fs = require('fs');

db.addCompactingFilter(function(key, val){
    return /magic/.test(val);
});

db.on('load', function(){
    db.set('red', 'lightning Bolt');
    db.set('black', 'dark ritual');
    db.set('blue', 'ancestral recall');
    db.set('white', 'healing salve');
    db.set('green', 'llanowar Elves');
    db.set('purple', 'some magic');
    db.on('drain', function(){
        db.set('green', 'giant growth');
        db.compact();
        db.on('compacted', function(){
            assert.strictEqual(
              fs.readFileSync(DB_FILE, 'utf-8'),
              JSON.stringify({key: 'red', 'val': 'lightning Bolt'})+'\n'+ 
              JSON.stringify({key: 'black', 'val': 'dark ritual'})+'\n'+ 
              JSON.stringify({key: 'blue', 'val': 'ancestral recall'})+'\n'+ 
              JSON.stringify({key: 'white', 'val': 'healing salve'})+'\n'+ 
              JSON.stringify({key: 'green', 'val': 'giant growth'})+'\n' 
            );
        })
    })  
})