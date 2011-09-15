require('../common');
var assert = require('assert');

var dirty = require('dirty')('');
var foo = '';

dirty.set('foo', 'bar', function() {
	foo = dirty.get('foo');
});

setTimeout(function() {
  assert.equal(foo, 'bar');
}, 500);