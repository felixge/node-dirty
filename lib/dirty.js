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
  this.docs = [];
  this._keys = {};
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
          self._keys[doc._key] = (self.docs.push(doc)-1);
          buffer = buffer.substr(offset+1);
        }
        read();
      });
    };
  read();

  return promise;
};

Dirty.prototype.add = function(doc) {
  return this.set(dirty.uuid(), doc);
};

Dirty.prototype.set = function(key, doc) {
  doc._key = key;
  this._keys[key] = (this.docs.push(doc)-1);
  return this.file.write(JSON.stringify(doc)+"\n");
};

Dirty.prototype.get = function(key) {
  return this.docs[this._keys[key]];
};

Dirty.prototype.filter = function(fn) {
  return this.docs.filter(fn);
};