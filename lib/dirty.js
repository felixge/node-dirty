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
    self = this,
    docs = {},
    log = [],
    flushing = false,
    file = fs.createWriteStream(filePath, {flags: 'a+'});

  this.add = function(doc, cb) {
    var id = dirty.uuid();
    this.set(id, doc, cb);
    return id;
  };

  this.set = function(id, doc, cb) {
    if (doc !== undefined) {
      docs[id] = doc;
    } else {
      delete docs[id];
    }

    log.push(!cb ? id : [id, cb]);

    if (options.flushLimit && !flushing && options.flushLimit >= log.length) {
      this.flush();
    }
  };

  this.get = function(id) {
    return docs[id];
  };

  this.remove = function(id, cb) {
    this.set(id, undefined, cb);
  };

  this.flush = function(flushCb) {
    flushing = true;

    var
      chunkCallbacks = [],
      chunk = '',
      id;

    while (true) {
      id = log.shift();
      if (id === undefined) {
        break;
      }

      if (id instanceof Array) {
        chunkCallbacks.push(id[1]);
        id = id[0];
      }

      if (id in docs) {
        chunk += JSON.stringify({id: id, value: docs[id]})+"\n";
      } else {
        chunk += JSON.stringify({id: id, deleted: true})+"\n";
      }

      if (chunk.length < 16 * 1024 && log.length) {
        continue;
      }

      file.write(chunk, function(err) {
        chunkCallbacks.forEach(function(cb) {
          cb(err);
        });
        callbacks = [];

        if (err) {
          if (flushCb) {
            flushCb(err);
          }
          self.emit('error', err);
        }

        flushing = false;

        if (log.length) {
          self.flush();
        } else if (flushCb) {
          cb(null);
        }
      });
    }
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
};
sys.inherits(Dirty, events.EventEmitter);

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