process.mixin(require('../test/common'));

var
  FILE = __dirname+'/set.dirty',
  stress = require('node-stress');

stress.config({
  duration: 100
});

stress.test('dirty.get', function(iterations) {
  var
    i = 0,
    j = 0,
    start,
    db = new Dirty(FILE, {flushLimit: false, flushInterval: false});

  for (; i < iterations; i++) {
    db.set(i, 'This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256');
  }

  i = 0;
  start = +new Date;
  for (; i < iterations; i++) {
    if (db.get(i).length == 256) {
      j++;
    }
  }
  if (j !== iterations) {
    throw new Error('get error');
  }
  return +new Date - start;
});