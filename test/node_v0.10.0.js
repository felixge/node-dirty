var dirty = require('../index.js');

if (!process.version.match(/v0\.10\./)) {
	console.warn("WARNING: Known issue in node.js v0.10.x can only be tested with an appropriate version of Node installed.");
}
else {
	// Test Node v0.10.0 compatibility
	describe('with node v0.10.0', function() {
			describe('db.set()', function() {
				describe('using the disk store', function() {
					it('should trigger the callback if provided', function(cb) {
						connectToMemDb(function (err, db) {
							if (err) return cb(err);

							// Set sample db entry
							db.set('sample', {
								id: Math.round(Math.random()*100)
							}, function (err) {
								cb(err);
							});
						});
					});
				});
				describe('using the memory store', function() {
					it('should trigger the callback if provided', function(cb) {
						connectToDiskDb(function (err, db) {
							if (err) return cb(err);

							// Set sample db entry
							db.set('sample', {
								id: Math.round(Math.random()*100)
							}, function (err) {
								cb(err);
							});
						});
					});
				});
			});
	});
}


// Instantiate sample memory database
function connectToMemDb(cb) {
	var db = new(dirty.Dirty)();
	db.on('load', function (err){
		cb(err, db);
	});
}

// Instantiate sample disk database
function connectToDiskDb(cb) {
	var db = dirty('dirty.db');
	db.on('load', function (err){
		cb(err, db);
	});
}