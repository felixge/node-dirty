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

var
  duration = (+new Date()) - start,
  perSec = (i/duration*1000).toFixed(0);

puts('MEMORY: '+i+' writes in '+duration+' ms '+"\t"+'('+perSec+' per sec)');

posts.addListener('flush', function() {
  var
    duration = ((+new Date()) - start) / 1000,
    perSec = (i/duration).toFixed(0);

  puts('DISK:   '+i+' writes in '+duration.toFixed(2)+' sec '+"\t"+'('+perSec+' per sec)');
});