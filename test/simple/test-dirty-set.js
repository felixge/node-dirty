require('../common');
var PROPERTIES = []
  , Dirty = require('dirty').Dirty
  , dirty1 = new Dirty();

dirty1.set('foo', 'bar');
assert.deepEqual(dirty1._docs, {foo: 'bar'});