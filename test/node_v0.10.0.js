var _ = require('underscore');
var async = require('async');
var dirty = require('../index.js');

if (!process.version.match(/v0\.10\./)) {
	console.warn("WARNING: Known issue in node.js v0.10.x can only be tested with an appropriate version of Node installed.");
}
else {
	// Test Node v0.10.0 compatibility
	describe('with node v0.10.0', function() {
		describe('db.set()', function() {
			describe('using the memory store', function() {


				it('should trigger the callback for each of 10 db calls', function(cb) {
					connectToMemDb(function (err, db) {
						if (err) return cb(err);

						async.eachSeries(_.range(10),function (i,cb) {
							setSample(db,cb);
						}, cb);
					});
				});


				it('should trigger the callback if provided', function(cb) {
					connectToMemDb(function (err, db) {
						if (err) return cb(err);
						setSample(db,cb);
					});
				});
			});


			describe('using the disk store', function() {

				it('should trigger the callback if provided', function(cb) {
					connectToDiskDb(function (count, db) {
						setSample(db,cb);
					});
				});

				it('should work again as long as a fresh connection is used', function(cb) {
					connectToDiskDb(function (count, db) {
						setSample(db,cb);
					});
				});

				it('callback should fire each time if set() is used multiple times over the same db connection', function(cb) {
					connectToDiskDb(function (count, db) {
						async.eachSeries(_.range(2),function (i,cb) {
							setSample(db, cb);
						}, cb);
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
	db.on('load', function (err) {
		cb(err, db);
	});
}

// Set sample db entry
function setSample(db, cb) {
	var key = 'sample';
	var val = {id: Math.round(Math.random()*100)};
	db.set(key, val, cb);
}