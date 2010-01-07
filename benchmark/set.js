process.mixin(require('sys'));
var
  Dirty = require('../lib/dirty').Dirty,
  NUM = 10000,
  posts = new Dirty('posts'),
  testStr = 'This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256 byte string. This is a 256';

var start = +new Date();
for (var i = 0; i < NUM; i++) {
  posts.set(i, {str: testStr});
}

var
  duration = (+new Date()) - start,
  perSec = (NUM/duration*1000).toFixed(0);

puts('MEMORY: '+NUM+' writes in '+duration+' ms ('+perSec+' per sec)');

process.addListener('exit', function() {
  var
    duration = ((+new Date()) - start) / 1000,
    perSec = (NUM/duration).toFixed(2);

  puts('DISK: '+NUM+' writes in '+duration.toFixed(2)+' sec ('+perSec+' per sec)');
});