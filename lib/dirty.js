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

var Dirty = dirty.Dirty = function(file, options) {
  process.EventEmitter.call(this);

  this.file = new File(file, 'a+', {encoding: 'utf8'});
  this.docs = [];
  this._keys = {};

  // Wait for x docs to be in memory before flushing to disk
  this.memoryQueueLimit = 100;

  // Docs that are stored in memory only
  this.memoryQueueLength = 0;
  // Docs in the process of being written to disk
  this.diskQueueLength = 0;
};
process.inherits(Dirty, process.EventEmitter);

Dirty.prototype.__defineGetter__('length', function() {
  return this.docs.length;
});

Dirty.prototype.load = function() {
  var
    self = this,
    promise = new process.Promise(),
    buffer = '',
    offset = 0,
    read = function() {
      self.file.read(10).addCallback(function(chunk) {
        if (!chunk) {  
          return promise.emitSuccess();
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
  var uuid = dirty.uuid();
  this.set(uuid, doc);
  return uuid;
};

Dirty.prototype.set = function(key, doc) {
  doc._key = key;

  this._keys[key] = (this.docs.push(doc)-1);
  this.memoryQueueLength++;

  if (this.memoryQueueLength === this.memoryQueueLimit) {
    var
      self = this,
      chunk = '',
      length = this.docs.length;

    while (this.memoryQueueLength > 0) {
      this.memoryQueueLength--;
      chunk += JSON.stringify(this.docs[length-this.memoryQueueLength])+"\n";
    }

    this.diskQueueLength += this.memoryQueueLimit;
    this.file.write(chunk).addCallback(function() {
      self.diskQueueLength -= self.memoryQueueLimit;
      // If memory === disk, emit the flush event
      if (self.diskQueueLength === 0) {
        self.emit('flush');
      }
    });
  }
};

Dirty.prototype.get = function(key) {
  return this.docs[this._keys[key]];
};

Dirty.prototype.filter = function(fn) {
  return this.docs.filter(fn);
};