require('../common');
var DB_FILE = TEST_TMP+'/load.dirty';
db = require('dirty')(DB_FILE),
fs = require('fs'),
loaded = false;

db.addIndex('start', function(k,v){ 
    return v[0]; 
});
db.addIndex('end', function(k, v) { 
    return v.slice(-1); 
});

db.addCompactingFilter(function(k,v){
    return !(/\w1/.test(k)); 
});


db.on('load', function(){
    db.set("e1", 'hello');
    db.set("g1", 'buten tag');
    db.set("e2", 'hi');
    db.set("m1", 'salamat peg');
    db.set("j1", 'konnichiwa');
    assert.deepEqual([], db.find('start', 'g'));
    assert.deepEqual([{key: 'e1', val: 'hello'},{key: 'e2', val: 'hi'}], db.find('start', 'h'));
    db.on('drain', function() {
        db.rm("j1");
        db.set("g1", 'guten tag');
        assert.deepEqual([{key: 'g1', val: 'guten tag'},{key: 'm1', val: 'salamat peg'}], db.find('end','g'));
        assert.deepEqual([], db.find('start', 'j'));
        db.compact()
        db.on('compacted', function(){
            assert.deepEqual([{key: 'e1', val: 'hello'}], db.find('start', 'h'));
        });
    });
});
