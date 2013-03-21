if (!process.version.match(/v0\.10\./)) {
	console.warn("WARNING: Known issue in node.js v0.10.x can only be tested with an appropriate version of Node installed.");
}
else {
	// Test Node v0.10.0 compatibility
	describe('with node v0.10.0', function() {
			describe('db.set()', function() {
				it('should trigger the callback if provided', function() {
					// TODO
					return false;
				});
			});
	});
}