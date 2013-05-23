var config = require('./config'),
  path = require('path'),
  fs = require('fs'),
  dirty = require(config.LIB_DIRTY),
  assert = require('assert'),
  db;
var exists = (fs.exists) ? fs.exists : path.exists;
var file = config.TMP_PATH + '/compacttest.indexes';
describe('indexes', function(){
  var eva = {race: 'cra', damageType: 'ranged', sex: 'F'};
  var ama = {race: 'sadida', damageType: 'ranged', sex: 'F'};
  var yug = {race: 'eliatrope', set: 'M'};

  beforeEach(function(done){
    db = dirty(file);
    db.once('load', function(){
      db.addIndex('race', function(k,v){
          return v.race;
      });
      db.addIndex('damageType', function(k,v){
          return v.damageType;
      });
      db.set('Evangeline', eva);
      db.set('Amalia', ama);
      db.set('Yugo', yug);
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

  describe('.find', function() {
    it('returns nothing when searching for a non-existing element', function(){
      assert.deepEqual([], db.find('race', 'erutrof'));
    });

    it('returns the lone element if it exists', function(){
      assert.deepEqual([{key: 'Evangeline', val: eva}], db.find('race', 'cra'));
    });

    it('returns nothing if the item is deleted', function(){
      db.rm('Evangeline');
      assert.deepEqual([], db.find('race', 'cra'));
    });

    it('returns all items that match an index value', function(){
      var ranged = db.find('damageType', 'ranged');
      assert.deepEqual([{key: 'Evangeline', val: eva}, {key: 'Amalia', val: ama}], ranged);
    });

    it('returns an item under a new index if it is modified', function(){
      var newEva = db.get('Evangeline');
      newEva.race = 'cra-n';
      db.set('Evangeline', newEva);
      assert.deepEqual([], db.find('race', 'cra'));
      assert.deepEqual([{key: 'Evangeline', val: newEva}], db.find('race', 'cra-n'));
    });

    it.skip('does not find items for which the index function returns `undefined`', function(){
        assert.deepEqual([], db.find('damageType', undefined));
    });

    it('lists out all the values the index has taken', function(){
        assert.deepEqual(['cra', 'sadida', 'eliatrope'], db.indexValues('race'));
        assert.deepEqual(['ranged'], db.indexValues('damageType'));
    });
  });
});

