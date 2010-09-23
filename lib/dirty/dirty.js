if (global.GENTLY) require = GENTLY.hijack(require);

var fs = require('fs'),
    sys = require('sys'),
    EventEmitter = require('events').EventEmitter;

var Dirty = exports.Dirty = function(path) {
  if (!(this instanceof Dirty)) return new Dirty(path);

  EventEmitter.call(this);

  this.path = path;
  this.flushLimit = 1000;
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
};
