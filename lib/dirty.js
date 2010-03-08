var 
  dirty = exports,
  sys = require('sys'),
  events = require('events'),
  fs = require('fs');

dirty.uuid = function() {
  var uuid = '', i;
  for (i = 0; i < 32; i++) {
    uuid += Math.floor(Math.random() * 16).toString(16);
  }
  return uuid;
};

var Dirty = dirty.Dirty = function(filePath, options) {
  process.EventEmitter.call(this);

  options = process.mixin({
    flushInterval: 10,
    flushLimit: 1000,
  }, options || {});

  var
    docs = {},
    log = [],
    flushing = false,
    file = fs.createWriteStream(filePath);

  this.set = function(id, doc, cb) {
    docs[id] = doc;
    log.push(!cb ? id : [id, cb]);
  };

  this.get = function(id) {
    return docs[id];
  };

  file
    .addListener('drain', function() {
      if (!log.length) {
        self.emit('drain');
      }
    })
    .addListener('error', function(err) {
      self.emit('error', err);
    });

  // this._docs = [];
  // this._ids = {};
  // this._memoryIds = [];

  // Interval after which docs should be flushed to disk at latest
  // this.flushInterval = options.flushInterval;
  // 
  // // Listeners waiting for the next flush to finish
  // this.flushCallbacks = [];
  // 
  // // Wait for x docs to be in memory before flushing to disk
  // this.flushLimit = options.flushLimit;

  // Candidates for being flushed to disk
  // this.memoryQueueLength = 0;
  // // Docs in the process of being flushed to disk
  // this.flushQueueLength = 0;
  // 
  // this.length = 0;
};
sys.inherits(Dirty, events.EventEmitter);

Dirty.prototype.flush = function() {
  var
    self = this,
    callbacks = {},
    chunk = '',
    i = 0,
    id,
    cb;

  while (true) {
    id = self._log.shift();
    if (id === undefined) {
      break;
    }

    if (id instanceof Array) {
      cb = id[1];
      id = id[0];
    } else {
      cb = null;
    }

    if (cb) {
      callbacks[i] = callbacks[i] || [];
      callbacks[i].push(cb);
    }

    if (id in self.docs) {
      chunk += JSON.stringify({id: id, value: self.docs[id]})+"\n";
    } else {
      chunk += JSON.stringify({id: id, deleted: true})+"\n";
    }

    if (chunk.length < 16 * 1024 && self._log.length) {
      continue;
    }

    (function(i) {
      self._file.write(chunk, function(err) {
        callbacks[i].forEach(function(cb) {
          cb(err);
        });
        delete callbacks[i];

        if (err) {
          self.emit('error', err);
        }
      });
    })(i);

    i++;
    chunk = '';
  }
};

// Dirty.prototype.load = function() {
//   var
//     self = this,
//     promise = new process.Promise(),
//     buffer = '',
//     offset = 0,
//     read = function() {
//       self.file.read(16*1024).addCallback(function(chunk) {
//         if (!chunk) {
//           return promise.emitSuccess();
//         }
// 
//         buffer += chunk;
//         while ((offset = buffer.indexOf("\n")) !== -1) {
//           var doc = JSON.parse(buffer.substr(0, offset));
//           if (!(doc._id in self._ids) && !doc._deleted) {
//             self.length++;
//           }
//           if (doc._deleted) {
//             if (doc._id in self._ids) {
//               self._docs.splice(self._ids[doc._id], 1);
//               delete self._ids[doc._id];
//             }
//           } else {
//             self._ids[doc._id] = (self._docs.push(doc)-1);
//           }
//           buffer = buffer.substr(offset+1);
//         }
//         read();
//       })
//       .addErrback(function() {
//         promise.emitError(new Error('could not read from '+self.file.filename));
//       });
//     }
// 
//   read();
//   return promise;
// };

// Dirty.prototype.close = function() {
//   clearTimeout(this.flushTimer);
//   return this.file.close();
// };

// Dirty.prototype.add = function(doc, cb) {
//   var uuid = dirty.uuid();
//   this.set(uuid, doc, cb);
//   return uuid;
// };

// Dirty.prototype.set = function(id, doc, cb) {
//   doc._id = id;
// 
//   if (this._ids[id] === undefined && !doc._deleted) {
//     this.length++;
//   }
//   this._ids[id] = (this._docs.push(doc)-1);
//   if (!this.file) {
//     process.nextTick(function() {
//       cb(doc);
//     });
//     return;
//   }
// 
//   this._memoryIds.push(id);
//   this.memoryQueueLength++;
// 
//   if (this.memoryQueueLength === this.flushLimit) {
//     this.flush().addCallback(function() {
//       if (cb) {
//         cb(doc);
//       }
//     });
//   } else if (cb) {
//     this.flushCallbacks.push(function() {
//       cb(doc);
//     });
//   }
// 
//   // Start new flushTimer if needed
//   if (
//     (!this.flushTimer)
//     && (this.flushInterval)
//     && (this.memoryQueueLength !== this.flushLimit)
//   ) {
//     var self = this;
//     this.flushTimer = setTimeout(function() {
//       self.flush();
//     }, this.flushInterval);
//   }
// };

// Dirty.prototype.empty = function() {
//   this._ids = {};
//   this._docs = [];
// };
// 
// Dirty.prototype.flush = function() {
//   var promise = new process.Promise();
//   if (this.memoryQueueLength === 0 || !this.file) {
//     promise.emitSuccess();
//     return promise;
//   }
// 
//   var
//     self = this,
//     chunk = '',
//     length = this._memoryIds.length,
//     writePromises = 0,
//     dupes = {};
// 
//   this.flushQueueLength += length;
// 
//   this._memoryIds.forEach(function(id, i) {
//     if (!(id in dupes)) {
//       chunk += JSON.stringify(self._docs[self._ids[id]])+"\n";
//     }
//     dupes[id] = true;
// 
//     if (chunk.length < 16*1024 && i < (length-1)) {
//       return;
//     }
// 
//     writePromises++;
//     self.file.write(chunk).addCallback(function() {
//       writePromises--;
//       if (writePromises === 0) {
//         self.flushQueueLength -= length;
//         self.flushCallbacks.forEach(function(cb) {
//           cb();
//         });
//         self.flushCallbacks = [];
//         promise.emitSuccess();
//       }
// 
//       // If memory === disk, emit the flush event
//       if (self.flushQueueLength === 0 && self.memoryQueueLength === 0) {
//         // Clear flushTimer so the event loop can exit when idle
//         clearTimeout(self.flushTimer);
//         self.flushTimer = null;
// 
//         self.emit('flush');
//       }
//     });
// 
//     chunk = '';
//   });
//   this._memoryIds = [];
//   this.memoryQueueLength = 0;
// 
//   return promise;
// };
// 
// Dirty.prototype.get = function(id) {
//   var doc = this._docs[this._ids[id]];
//   return (doc && doc._deleted)
//     ? undefined
//     : doc;
// };
// 
// Dirty.prototype.remove = function(id, cb) {
//   var self = this;
// 
//   delete this._docs[this._ids[id]];
// 
//   this.length--;
//   this.set(id, {_deleted: true}, function() {
//     delete self._docs[self._ids[id]];
//     delete(self._ids[id]);
// 
//     if (cb) {
//       cb();
//     }
//   });
// };
// 
// Dirty.prototype.filter = function(fn) {
//   return this._docs.filter(fn);
// };