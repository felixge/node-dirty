var
  dirty = exports,
  File = require('file').File;

dirty.uuid = function() {
  var uuid = '';
  for (i = 0; i < 32; i++) {
    uuid += Math.floor(Math.random() * 16).toString(16);
  }
  return uuid;
};

var Dirty = dirty.Dirty = function(file) {
  this.file = new File(file, 'a+', {encoding: 'utf8'});
  this.docs = {};
  this.length = 0;
};

Dirty.prototype.load = function() {
  var
    self = this,
    promise = new process.Promise(),
    buffer = '',
    offset = 0,
    read = function() {
      self.file.read(10).addCallback(function(chunk) {
        if (!chunk) {  
          return promise.emitSuccess(self.length);
        }

        buffer += chunk;
        while ((offset = buffer.indexOf("\n")) !== -1) {
          var doc = JSON.parse(buffer.substr(0, offset));
          self.docs[doc._id] = doc;
          buffer = buffer.substr(offset+1);
        }
        read();
      });
    };
  read();

  return promise;
};

Dirty.prototype.add = function(doc) {
  this.set(dirty.uuid(), doc);
};

Dirty.prototype.set = function(id, doc) {
  doc._id = id;
  this.docs[id] = doc;
  return this.file.write(JSON.stringify(doc)+"\n");
};

Dirty.prototype.filter = function(fn) {
  var docs = {};
  for (var key in this.docs) {
    if (fn(key, this.docs[key]) === true) {
      docs[key] = this.docs[key];
    }
  }
  return docs;
}
