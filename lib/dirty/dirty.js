if (global.GENTLY) require = GENTLY.hijack(require);

var fs = require('fs'),
    sys = require('sys'),
    EventEmitter = require('events').EventEmitter;

var Dirty = exports.Dirty = function(path) {
  if (!(this instanceof Dirty)) return new Dirty(path);

  EventEmitter.call(this);

  this.path = path;
  this.flushLimit = 1000;
  this.writeBundle = 100;
  this._docs = {};
  this._queue = [];

  this.load();
};

sys.inherits(Dirty, EventEmitter);
Dirty.Dirty = Dirty;
module.exports = Dirty;

Dirty.prototype.load = function() {
  if (!this.path) {
    return;
  }

  this.writeStream = fs.createWriteStream(this.path, {
    encoding: 'utf-8',
    flags: 'a'
  });

  var self = this;
  this.writeStream.on('drain', function() {
    if (!self._queue.length) {
      self.emit('drain');
    }
  });
};

Dirty.prototype.get = function(key) {
  return this._docs[key];
};

Dirty.prototype.set = function(key, val, cb) {
  this._docs[key] = val;

  if (!cb) {
    this._queue.push(key);
  } else {
    this._queue.push([key, cb]);
  }

  this._maybeFlush();
};

Dirty.prototype._maybeFlush = function() {
  if (this.flushing || !this.path) {
    return;
  }

  if (this._queue.length >= this.flushLimit) {
    this.flush();
  }
};

Dirty.prototype.flush = function() {
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
      self.writeStream.write(bundleStr, function(err) {
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
