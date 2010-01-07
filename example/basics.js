process.mixin(require('sys'));
var
  Dirty = require('../lib/dirty').Dirty,
  posts = new Dirty('posts');

posts.load().addCallback(function() {
  posts.add({
    title: "Awesome post",
  });
  
  posts.add({
    title: "Lame post",
  });
  
  var awesome = posts.filter(function(key, doc) {
    return !!doc.title.match(/awesome/i);
  });

  p(awesome);
});