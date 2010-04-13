require('../common');
var PROPERTIES =
    [ '_docs'
    ]
  , Dirty = require('dirty').Dirty
  , dirty = new Dirty();

assert.properties(dirty, PROPERTIES);