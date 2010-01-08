process.mixin(require('sys'));
var
  Dirty = require('../lib/dirty').Dirty,
  NUM = 100000,
  posts = new Dirty('posts');

for (var i = 0; i < NUM; i++) {
  posts.set(i, {str: 'This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256'});
}

posts.addListener('flush', function() {
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