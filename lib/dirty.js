var
  dirty = exports,
  File = require('file').File;

dirty.uuid = function() {
  var uuid = '', i;
  for (i = 0; i < 32; i++) {
    uuid += Math.floor(Math.random() * 16).toString(16);
  }
  return uuid;
};

var Dirty = dirty.Dirty = function(file, options) {
  process.EventEmitter.call(this);
  options = process.mixin({
    flushInterval: 10,
    flushLimit: 1000,
  }, options);

  this.file = new File(file, 'a+', {encoding: 'utf8'});
  this._docs = [];
  this._keys = {};
  this._memoryKeys = [];

  // Interval after which docs should be flushed to disk at latest
  this.flushInterval = options.flushInterval;

  // Listeners waiting for the next flush to finish
  this.flushCallbacks = [];

  // Wait for x docs to be in memory before flushing to disk
  this.flushLimit = options.flushLimit;

  // Candidates for being flushed to disk
  this.memoryQueueLength = 0;
  // Docs in the process of being flushed to disk
  this.flushQueueLength = 0;

  this.length = 0;
};
process.inherits(Dirty, process.EventEmitter);

Dirty.prototype.load = function() {
  var
    self = this,
    promise = new process.Promise(),
    buffer = '',
    offset = 0,
    read = function() {
      self.file.read(16*1024).addCallback(function(chunk) {
        if (!chunk) {
          return promise.emitSuccess();
        }

        buffer += chunk;
        while ((offset = buffer.indexOf("\n")) !== -1) {
          var doc = JSON.parse(buffer.substr(0, offset));
          if (!(doc._key in self._keys) && !doc._deleted) {
            self.length++;
          }
          if (doc._deleted && (doc._key in self._keys)) {
            self.length++;
            delete self._keys[doc._key];
          } else {
            self._keys[doc._key] = (self._docs.push(doc)-1);
          }
          buffer = buffer.substr(offset+1);
        }
        read();
      })
      .addErrback(function() {
        promise.emitError(new Error('could not read from '+self.file.filename));
      });
    }

  read();
  return promise;
};

Dirty.prototype.close = function() {
  clearTimeout(this.flushTimer);
  return this.file.close();
};

Dirty.prototype.add = function(doc, cb) {
  var uuid = dirty.uuid();
  this.set(uuid, doc, cb);
  return uuid;
};

Dirty.prototype.set = function(key, doc, cb) {
  doc._key = key;

  if (this._keys[key] === undefined && !doc._deleted) {
    this.length++;
  }
  this._keys[key] = (this._docs.push(doc)-1);
  this._memoryKeys.push(key);
  this.memoryQueueLength++;

  if (this.memoryQueueLength === this.flushLimit) {
    this.flush().addCallback(function() {
      if (cb) {
        cb(doc);
      }
    });
  } else if (cb) {
    this.flushCallbacks.push(function() {
      cb(doc);
    });
  }

  // Start new flushTimer if needed
  if (
    (!this.flushTimer)
    && (this.flushInterval)
    && (this.memoryQueueLength !== this.flushLimit)
  ) {
    var self = this;
    this.flushTimer = setTimeout(function() {
      self.flush();
    }, this.flushInterval);
  }
};

Dirty.prototype.empty = function() {
  this._keys = {};
  this._docs = [];
};

Dirty.prototype.flush = function(cb) {
  var promise = new process.Promise();
  if (this.memoryQueueLength === 0) {
    setTimeout(function() {
      promise.emitSuccess();
    }, 0);
    return promise;
  }

  var
    self = this,
    chunk = '',
    length = this._memoryKeys.length,
    writePromises = 0,
    dupes = {};

  this.flushQueueLength += length;

  this._memoryKeys.forEach(function(key, i) {
    if (!(key in dupes)) {
      chunk += JSON.stringify(self._docs[self._keys[key]])+"\n";
    }
    dupes[key] = true;

    if (chunk.length < 16*1024 && i < (length-1)) {
      return;
    }

    writePromises++;
    self.file.write(chunk).addCallback(function() {
      writePromises--;
      if (writePromises === 0) {
        self.flushQueueLength -= length;
        self.flushCallbacks.forEach(function(cb) {
          cb();
        });
        self.flushCallbacks = [];
        promise.emitSuccess();
      }

      // If memory === disk, emit the flush event
      if (self.flushQueueLength === 0 && self.memoryQueueLength === 0) {
        // Clear flushTimer so the event loop can exit when idle
        clearTimeout(self.flushTimer);
        self.flushTimer = null;

        self.emit('flush');
      }
    });

    chunk = '';
  });
  this._memoryKeys = [];
  this.memoryQueueLength = 0;

  return promise;
};

Dirty.prototype.get = function(key) {
  var doc = this._docs[this._keys[key]];
  return (doc && doc._deleted)
    ? undefined
    : doc;
};

Dirty.prototype.remove = function(key, cb) {
  var self = this;

  self._docs.splice(this._keys[key], 1);

  this.length--;
  this.set(key, {_deleted: true}, function() {
    self._docs.splice(self._keys[key], 1);

    delete(self._keys[key]);
    cb();
  });
};

Dirty.prototype.filter = function(fn) {
  return this._docs.filter(fn);
};