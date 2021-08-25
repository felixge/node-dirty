require('../common');

var Dirty = require('Dirty');
var db = new Dirty('undef-key.dirty');

db.set('now', Date.now());

db.set('gobble', 'adfasdf');

db.set('now', undefined, function() {
	// callback?
	// impossible yes?!
	console.log('blamo!')
});

db.set(undefined);

console.log(db.get('now'));
