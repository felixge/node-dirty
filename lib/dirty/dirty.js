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
  this._keys = [];
  this._queue = [];
  this._readStream = null;
  this._writeStream = null;

  this._load();
};

sys.inherits(Dirty, EventEmitter);
Dirty.Dirty = Dirty;
module.exports = Dirty;

Dirty.prototype.set = function(key, val, cb) {
  if (val === undefined) {
    this._keys.splice(this._keys.indexOf(key), 1)
    delete this._docs[key];
  } else {
    if (!this._keys[key]) {
      this._keys.push(key);
    }
    this._docs[key] = val;
  }

  if (!cb) {
    this._queue.push(key);
  } else {
    this._queue.push([key, cb]);
  }

  this._maybeFlush();
};

Dirty.prototype.get = function(key) {
  return this._docs[key];
};

Dirty.prototype.rm = function(key, cb) {
  this.set(key, undefined, cb);
};

Dirty.prototype.forEach = function(fn) {

  for (var i = 0; i < this._keys.length; i++) {
    var key = this._keys[i];
    if (fn(key, this._docs[key]) === false) {
      break;
    }
  }

};

Dirty.prototype._load = function() {
  if (!this.path) {
    return;
  }

  var self = this, buffer = '', length = 0;
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

        if (row.val === undefined) {
          if (row.key in self._docs) {
            length--;
          }
          delete self._docs[row.key];
        } else {
          if (!(row.key in self._docs)) {
            length++;
          }
          self._keys.push(row.key);
          self._docs[row.key] = row.val;
        }
        return '';
      });
    })
    .on('end', function() {
      if (buffer.length) {
        self.emit('error', new Error('Corrupted row at the end of the db: '+buffer));
      }
      self.emit('load', length);
    });

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
  if (this.flushing || !this.path || !this._queue.length) {
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
