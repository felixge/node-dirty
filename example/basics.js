process.mixin(require('sys'));
var
  Dirty = require('../lib/dirty').Dirty,
  posts = new Dirty('posts');

posts.load().addCallback(function(length) {
  puts(posts.length+' posts');

  posts.add({
    title: "Awesome post",
  });
  
  var post = {
    title: "Lame post",
  };
  posts.add(post);

  puts(posts.get(post._key).title);

  var awesome = posts.filter(function(doc) {
    return !!doc.title.match(/awesome/i);
  });

  p(awesome);
});