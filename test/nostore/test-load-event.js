require('../common');
var assert = require('assert');

var dirty = require('dirty')('');
var isLoaded = false;

dirty.on('load', function() {
  isLoaded = true;
});

setTimeout(function() {
  assert.equal(isLoaded, true);
}, 500);