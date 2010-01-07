process.mixin(require('sys'));
var
  Dirty = require('../lib/dirty').Dirty,
  NUM = 100000,
  posts = new Dirty('posts');

var start = +new Date();
for (var i = 0; i < NUM; i++) {
  posts.set(i, {str: 'This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256'});
}

var
  duration = (+new Date()) - start,
  perSec = (NUM/duration*1000).toFixed(0);

puts('MEMORY: '+NUM+' writes in '+duration+' ms '+"\t"+'('+perSec+' per sec)');

posts.addListener('flush', function() {
  var
    duration = ((+new Date()) - start) / 1000,
    perSec = (NUM/duration).toFixed(0);

  puts('DISK:   '+NUM+' writes in '+duration.toFixed(2)+' sec '+"\t"+'('+perSec+' per sec)');
});