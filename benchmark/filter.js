process.mixin(require('sys'));
var
  path = require('path'),

  DURATION = 10000,
  FILE = path.join(path.dirname(__filename), 'filter.dirty'),

  Dirty = require('../lib/dirty').Dirty,
  posts = new Dirty(FILE)
  start = +new Date(),
  docsAdded = 0;

while (true) {
  posts.set(docsAdded, {str: 'This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256'});
  docsAdded++;

  if (docsAdded % 1000 && ((+new Date() - start) > DURATION)) {
    break;
  }
}

// Add one more doc if we didn't add an even amount of documents
if (docsAdded % 2) {
  posts.set(docsAdded, {str: 'This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256'});
  docsAdded++;
}

puts(docsAdded+' docs added in '+((+new Date()) - start)+'ms');

posts.addListener('flush', function() {
  puts("flushed to disc, starting filtering ...\n");

  var
    start = +new Date(),
    docsFiltered = 0,
    docsReturned = 0;

  while (true) {
    docsReturned = posts.filter(function(doc) {
      return doc._key % 2;
    }).length;

    // Make sure we got the expected amount of docs returned
    if ((docsReturned * 2) !== docsAdded) {
      throw new Error('no cheating!'+JSON.stringify([docsReturned, docsAdded]));
    }

    // Multiplying by 2 since only half the docs were returned
    docsFiltered += (docsReturned * 2);

    if (+new Date() - start >= DURATION) {
      break;
    }
  }

  var
    duration = (+new Date()) - start,
    perSec = (docsFiltered/duration*1000).toFixed(0);

  puts('Filtered '+docsFiltered+' docs in '+duration+' ms '+"\t"+'('+perSec+' per sec)');
});