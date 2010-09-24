require('../common');
var db = require('dirty')();

db.set(1, {test: 'foo'});
db.set(2, {test: 'bar'});
db.set(3, {test: 'foobar'});

var i = 0;
db.forEach(function(key, doc) {
  i++;
  assert.equal(key, i);
  assert.strictEqual(doc, db.get(key));
});

assert.equal(i, 3);
