process.mixin(require('../test/common'));
var
  DURATION = 1000,
  FILE = path.join(path.dirname(__filename), 'set.dirty'),

  Dirty = require('../lib/dirty').Dirty,
  posts = new Dirty(FILE, {flushLimit: 1000000})
  start = +new Date(),
  i = 0;

while (true) {
  posts.set(i, {str: 'This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256'});
  i++;

  // Only run new Date() every 1000 records
  if ((i % 1000 === 0) && ((+new Date() - start) > DURATION)) {
    break;
  }
}

var
  duration = (+new Date()) - start,
  perSec = (i/duration*1000).toFixed(0);

puts('MEMORY: '+i+' writes in '+duration+' ms '+"\t"+'('+perSec+' per sec)');

posts.addListener('flush', function() {
  var
    duration = ((+new Date()) - start) / 1000,
    perSec = (i/duration).toFixed(0);

  puts('DISK:   '+i+' writes in '+duration.toFixed(2)+' sec '+"\t"+'('+perSec+' per sec)');

  posix.unlink(FILE);
});