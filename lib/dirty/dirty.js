if (global.GENTLY) require = GENTLY.hijack(require);

var fs = require('fs'),
    sys = require('sys'),
    EventEmitter = require('events').EventEmitter;

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
};

sys.inherits(Dirty, EventEmitter);
Dirty.Dirty = Dirty;
module.exports = Dirty;

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

Dirty.prototype.get = function(key) {
  return this._docs[key];
};

Dirty.prototype.rm = function(key, cb) {
  this.set(key, undefined, cb);
};

Dirty.prototype.forEach = function(fn) {
  for (var key in this._docs) {
    if (fn(key, this._docs[key]) === false) {
      break;
    }
  }
};

Dirty.prototype._load = function() {
  if (!this.path) {
    return;
  }
  var self = this, buffer = '';
  this._readStream = fs.createReadStream(this.path, {
    encoding: 'utf-8',
    flags: 'r'
  });

  this._readStream
    .on('error', function(err) {
      if (err.code == 'ENOENT') {
        self.emit('load', 0);
        return;
      }

      self.emit('error', err);
    })
    .on('data', function(chunk) {
      buffer += chunk;
      buffer = buffer.replace(/([^\n]+)\n/g, function(m, rowStr) {
        try {
          var row = JSON.parse(rowStr);
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
      self.flushing = false;
      if (!self._queue.length) {
        self.emit('drain');
      } else {
        self._maybeFlush();
      }
    });
};

Dirty.prototype._maybeFlush = function() {
  if (this.flushing || !this.path || !this._queue.length || this.compacting) {
      
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
      self._writeStream.write(bundleStr, function(err) {
        if (!cbs.length && err) {
          self.emit('error', err);
          return;
        }

        while (cbs.length) {
          cbs.shift()(err);
        }
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

Dirty.prototype.on('compacted', function(){
    this._endCompacting();
});

Dirty.prototype.on('compactingError', function(){
    this._queue = this._queueBackup.concat(this._queue);
    this._redundantLength += this._redundantLengthBackup;
    this._endCompacting();
});

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
