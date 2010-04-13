require('../common');
var PROPERTIES = []
  , Dirty = require('dirty').Dirty
  , dirty1 = new Dirty();

dirty1._docs['hello'] = 'world';
assert.equal(dirty1.get('hello'), 'world');

assert.strictEqual(dirty1.get('does not exist'), undefined);