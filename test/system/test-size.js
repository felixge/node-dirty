require('../common');
var db = require(global.ROOT_LIB)();

db.set(1, {test: 'foo'});
db.set(2, {test: 'bar'});
db.set(3, {test: 'foobar'});

assert.equal(db.size(), 3);
