if (global.GENTLY) require = GENTLY.hijack(require);

var fs = require('fs'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter;

/**
* Constructor function
*/
var Dirty = exports.Dirty = function(path) {
  if (!(this instanceof Dirty)) return new Dirty(path);

  EventEmitter.call(this);

  this.path = path;
  this.writeBundle = 1000;

  this._docs = {};
  this._queue = [];
  this._readStream = null;
  this._writeStream = null;
  this._compactingFilters = [];
  this._indexFns = {};
  this._length = 0;
  this._redundantLength = 0;
  this._load();
  var self = this;
  this.on('compacted', function(){
      self._endCompacting();
  });
  this.on('compactingError', function(){
      self._queue = self._queueBackup.concat(self._queue);
      self._redundantLength += self._redundantLengthBackup;
      self._endCompacting();
  });
};

util.inherits(Dirty, EventEmitter);
Dirty.Dirty = Dirty;
module.exports = Dirty;

/**
* set() stores a JSON object in the database at key
* cb is fired when the data is persisted.
* In memory, this is immediate- on disk, it will take some time.
*/
Dirty.prototype.set = function(key, val, cb) {
  this._updateDocs(key, val);
    if (!cb) {
      this._queue.push(key);
    } else {
      this._queue.push([key, cb]);
    }
    this._maybeFlush();
};

Dirty.prototype._updateDocs = function(key, val, skipRedundantRows) {
    this._updateIndexes(key, val);
    if (key in this._docs) {
        this._length--;
        if (!skipRedundantRows) this._redundantLength++;
    }
    if (val === undefined) {
        if (!skipRedundantRows) this._redundantLength++;
        delete this._docs[key];
    } else {
        this._length++;
        this._docs[key] = val;
    }
};

/**
* Get the value stored at a key in the database
* This is synchronous since a cache is maintained in-memory
*/
Dirty.prototype.get = function(key) {
  return this._clone(this._docs[key]);
};

Dirty.prototype._clone = function(obj) {
    if (Object.prototype.toString.call(obj) === '[object Array]') {
        return obj.slice();
    }

    if (Object.prototype.toString.call(obj) !== '[object Object]') {
        return obj;
    }
    var retval = {};
    for (var k in obj) {
        retval[k] = obj[k];
    }
    return retval;
};

/**
* Get total number of stored keys
*/
Dirty.prototype.size = function() {
  return this.length;
};

/**
* Remove a key and the value stored there
*/
Dirty.prototype.rm = function(key, cb) {
  this.set(key, undefined, cb);
};


/**
* Iterate over keys, applying match function
*/
Dirty.prototype.forEach = function(fn) {
  for (var key in this._docs) {
    if (fn(key, this._docs[key]) === false) {
      break;
    }
  }
};


// Called when a dirty connection is instantiated
Dirty.prototype._load = function() {
  var self = this, buffer = '', length = 0;

  if (!this.path) {
    process.nextTick(function() {
      self.emit('load', 0);
    });
    return;
  }

  this._readStream = fs.createReadStream(this.path, {
    encoding: 'utf-8',
    flags: 'r'
  });

  this._readStream
    .on('error', function(err) {
      if (err.code === 'ENOENT') {
        self.emit('load', 0);
        return;
      }

      self.emit('error', err);
    })
    .on('data', function(chunk) {
      buffer += chunk;
      if (chunk.lastIndexOf('\n') == -1) return;
      var arr = buffer.split('\n');
      buffer = arr.pop();
      arr.forEach(function(rowStr) {
        if (!rowStr) {
          self.emit('error', new Error('Empty lines never appear in a healthy database'));
          return;
        }

        var row;
        try {
          row = JSON.parse(rowStr);
          if (!('key' in row)) {
            throw new Error();
          }
        } catch (e) {
          self.emit('error', new Error('Could not load corrupted row: '+rowStr));
          return '';
        }
        self._updateDocs(row.key, row.val);
        return '';
      });
    })
    .on('end', function() {
      if (buffer.length) {
        self.emit('error', new Error('Corrupted row at the end of the db: '+buffer));
      }
      self.emit('load', self._length);
    });
    this._recreateWriteStream();
};

Dirty.prototype._recreateWriteStream = function(){
  var self = this;
  this._writeStream = fs.createWriteStream(this.path, {
    encoding: 'utf-8',
    flags: 'a'
  });

  this._writeStream.on('drain', function() {
    self._writeDrain();
  });
};

Dirty.prototype._writeDrain = function() {
  this.flushing = false;

  if (!this._queue.length) {
    this.emit('drain');
  } else {
    this._maybeFlush();
  }
};

Dirty.prototype._maybeFlush = function() {
  if (this.flushing || !this._queue.length || this.compacting) {
    return;
  }
  this._flush();
};

Dirty.prototype._flush = function() {
  var self = this,
      length = this._queue.length,
      bundleLength = 0,
      bundleStr = '',
      key,
      cbs = [];

  this.flushing = true;

  function callbacks(err, cbs) {
    while (cbs.length) {
      cbs.shift()(err);
    }
  }

  for (var i = 0; i < length; i++) {
    key = this._queue[i];
    if (Array.isArray(key)) {
      cbs.push(key[1]);
      key = key[0];
    }

    bundleStr += JSON.stringify({key: key, val: this._docs[key]})+'\n';
    bundleLength++;

    if (bundleLength < this.writeBundle && i < length - 1) {
      continue;
    }

    (function(cbs) {
      var isDrained;

      if (!self.path) {
        process.nextTick(function() {
          callbacks(null, cbs);
          self._writeDrain();
        });
        return;
      }

      isDrained = self._writeStream.write(bundleStr, function(err) {
        if (isDrained) {
          self._writeDrain();
        }

        if (!cbs.length && err) {
          self.emit('error', err);
          return;
        }

        callbacks(err, cbs);
      });

    })(cbs);

    bundleStr = '';
    bundleLength = 0;
    cbs = [];
  }

  this._queue = [];
};

Dirty.prototype.__defineGetter__("_compactPath", function() {
    return this.path + ".compact";
});

Dirty.prototype.__defineGetter__('length', function(){
    return this._length;
});

Dirty.prototype.__defineGetter__('redundantLength', function(){
    return this._redundantLength;
});

Dirty.prototype.compact = function(cb) {
    if (this.compacting) return;
    var self = this;
    this.compacting = true;

    if (this.flushing) {
        this._writeStream.once('drain', function(){
            self._startCompacting();
        });
    } else {
        this._startCompacting();
    }
};

Dirty.prototype._startCompacting = function() {
    var self = this;
    this._queueBackup = this._queue;
    this._queue = [];
    this._redundantLengthBackup = this._redundantLength;
    this._redundantLength = 0;
    var ws = fs.createWriteStream(this._compactPath, {
        encoding: 'utf-8',
        flags: 'w'
    });
    ws.on("error", function(){
        self.emit('compactingError');
    });
    ws.on('drain', function(){
        self._moveCompactedDataOverOriginal();
    });
    this._writeCompactedData(ws);
};

Dirty.prototype._moveCompactedDataOverOriginal = function() {
    var self = this;
    fs.rename(this._compactPath, this.path, function(err){
        self._recreateWriteStream();
        if (err) self.emit('compactingError');
        else self.emit('compacted');
    });
}

Dirty.prototype._endCompacting = function() {
    this._queueBackup = [];
    this._redundantLengthBackup = 0;
    this.compacting = false;
    this._maybeFlush();
};

Dirty.prototype._writeCompactedData = function(ws) {
    var bundleLength = 0;
    var bundleStr = '';
    var writeToStream = function() {
        ws.write(bundleStr);
        bundleStr = '';
        bundleLength = 0;
    }
    for (var k in this._docs) {
        var doc = this._docs[k];
        if (this._compactingFilters.some(function(filterFn){
            return filterFn(k, doc);
        })) {
            this._updateDocs(k, undefined, true);
            continue;
        }
        bundleStr += JSON.stringify({key: k, val: doc})+'\n';
        bundleLength++;
        if (bundleLength >= this.writeBundle) {
            writeToStream();
        }
    };
    writeToStream();
};

Dirty.prototype.addCompactingFilter = function(filter) {
    this._compactingFilters.push(filter);
};

Dirty.prototype.addIndex = function(index, indexFn) {
    this._indexFns[index] = {indexFn: indexFn, keyMap: {}};
};

Dirty.prototype._deleteKeyFromIndexedKeys = function(keyMap, indexValue, key) {
    var keys = keyMap[indexValue];
    keys.splice(keys.indexOf(key), 1);
    if (keys.length === 0) delete keyMap[indexValue];
};

Dirty.prototype._addKeyToIndexedKeys = function(keyMap, indexValue, key) {
    var keys = keyMap[indexValue] || [];
    keys.push(key);
    keyMap[indexValue] = keys;
};

Dirty.prototype._updateIndex = function(index, key, newVal) {
    var indexFn = this._indexFns[index].indexFn;
    var keyMap = this._indexFns[index].keyMap;
    if (key in this._docs) {
        var oldIndexValue = indexFn(key, this._docs[key]);
        if (newVal != undefined) {
            var newIndexValue = indexFn(key, newVal);
            if (oldIndexValue === newIndexValue) return;
            this._deleteKeyFromIndexedKeys(keyMap, oldIndexValue, key);
            this._addKeyToIndexedKeys(keyMap, newIndexValue, key);
        } else this._deleteKeyFromIndexedKeys(keyMap, oldIndexValue, key);
    } else {
        if (newVal != undefined) {
            var newIndexValue = indexFn(key, newVal);
            this._addKeyToIndexedKeys(keyMap, newIndexValue, key);
        }
    }
};

Dirty.prototype._updateIndexes = function(key, newVal) {
   for (index in this._indexFns) {
       this._updateIndex(index, key, newVal);
   };
};

Dirty.prototype.find = function(index, value) {
    var self = this;
    var validKeys = this._indexFns[index].keyMap[value];
    return !validKeys ? [] :
        validKeys.map(function(k){
            return {key: k, val: self._docs[k]};
    });
};

Dirty.prototype.indexValues = function(index) {
    return _(this._indexFns[index].keyMap).keys();
};
