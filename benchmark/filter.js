process.mixin(require('sys'));
var
  Dirty = require('../lib/dirty').Dirty,
  posts = new Dirty('posts')
  start = +new Date(),
  i = 0;

while (true) {
  posts.set(i, {str: 'This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256'});
  i++;

  if (i % 1000 && ((+new Date() - start) > 1000)) {
    break;
  }
}
puts(i+' docs added in '+((+new Date()) - start)+'ms');

posts.addListener('flush', function() {
  puts("flushed to disc, starting filtering ...\n");

  var
    start = +new Date(),
    i = 0;

  while (true) {
    posts.filter(function(doc) {
      i++;
    });

    if (+new Date() - start >= 1000) {
      break;
    }
  }

  var
    duration = (+new Date()) - start,
    perSec = (i/duration*1000).toFixed(0);

  puts('Filtered '+i+' docs in '+duration+' ms '+"\t"+'('+perSec+' per sec)');
});