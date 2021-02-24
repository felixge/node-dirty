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

  this._docs = {};
  this._keys = [];
  this._queue = new Map(); // Maps key to a list of callbacks.
  this._readStream = null;
  this._writeStream = null;
  this._waitForDrain = false;
  this._inFlightWrites = 0;

  this._load();
  return this;
};

util.inherits(Dirty, EventEmitter);
Dirty.Dirty = Dirty;
module.exports = Dirty;


/**
* set() stores a JSON object in the database at key
* cb is fired when the data is persisted.
* In memory, this is immediate - on disk, it will take some time.
*/
Dirty.prototype.set = function(key, val, cb) {
  if (val === undefined) {
    delete this._docs[key];
    const i = this._keys.indexOf(key);
    if (i === -1) return;
    this._keys.splice(i, 1);
  } else {
    if (this._keys.indexOf(key) === -1) {
      this._keys.push(key);
    }
    this._docs[key] = val;
  }
  if (this.path) {
    let cbs = this._queue.get(key) || [];
    if (cb) cbs.push(cb);
    this._queue.set(key, cbs);
    this._flush();
  } else {
    setImmediate(() => { if (cb) cb(); this.emit('drain'); });
  }
};

/**
* Get the value stored at a key in the database
* This is synchronous since a cache is maintained in-memory
*/
Dirty.prototype.get = function(key) {
  return this._docs[key];
};

/**
* Get total number of stored keys
*/
Dirty.prototype.size = function() {
  return this._keys.length;
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

  for (var i = 0; i < this._keys.length; i++) {
    var key = this._keys[i];
    if (fn(key, this._docs[key]) === false) {
      break;
    }
  }

};

/**
* Update the value stored at a key in the database.
* This is synchronous since a cache is maintained in-memory
* cb is passed as per Dirty.prototype.set
*/
Dirty.prototype.update = function(key, updater, cb) {
  this.set(key, updater(this.get(key)), cb);
};

/**
 * Close dirty db file streams
 */
Dirty.prototype.close = function() {
  if (this._queue.size || this._inFlightWrites > 0) {
    this.once('drain', () => this.close());
    return;
  }
  if (this._readStream) this._readStream.destroy();
  if (this._writeStream) this._writeStream.end(() => this._writeStream.destroy());
};

// Called when a dirty connection is instantiated
Dirty.prototype._load = function() {
  var buffer = '';

  if (!this.path) {
    process.nextTick(() => {
      this.emit('load', 0);
    });
    return;
  }

  this._readStream = fs.createReadStream(this.path, {
    encoding: 'utf-8',
    flags: 'r'
  });

  this._readStream
    .on('error', (err) => {
      if (err.code === 'ENOENT') {
        this.emit('load', 0);
        return;
      }

      this.emit('error', err);
    })
    .on('data', (chunk) => {
      buffer += chunk;
      if (chunk.lastIndexOf('\n') == -1) return;
      var arr = buffer.split('\n');
      buffer = arr.pop();
      arr.forEach((rowStr) => {
        if (!rowStr) {
          this.emit('error', new Error('Empty lines never appear in a healthy database'));
          return;
        }

        var row;
        try {
          row = JSON.parse(rowStr);
          if (!('key' in row)) {
            throw new Error();
          }
        } catch (e) {
          this.emit('error', new Error('Could not load corrupted row: '+rowStr));
          return '';
        }

        if (row.val === undefined) {
          delete this._docs[row.key];
          const i = this._keys.indexOf(row.key);
          if (i !== -1) this._keys.splice(i, 1);
        } else {
          if (!(row.key in this._docs)) {
            if (this._keys.indexOf(row.key) === -1) {
              this._keys.push(row.key);
            }
          }
          this._docs[row.key] = row.val;
        }
        return '';
      });
    })
    .on('end', () => {
      if (buffer.length) {
        this.emit('error', new Error('Corrupted row at the end of the db: '+buffer));
      }
      this.emit('load', this._keys.length);
    })
    .on('close', () => {
      this._readStream = null;
      this.emit('read_close');
    });

  this._writeStream = fs.createWriteStream(this.path, {
    encoding: 'utf-8',
    flags: 'a'
  });

  this._writeStream.on('drain', () => {
    this._waitForDrain = false;
    if (!this._queue.size) {
      if (this._inFlightWrites <= 0) this.emit('drain');
    } else {
      this._flush();
    }
  });

  this._writeStream.on('close', () => {
    this._writeStream = null;
    this.emit('write_close');
  });
};

Dirty.prototype._flush = function() {
  if (!this._queue.size || this._waitForDrain) return;
  this._writeStream.cork();
  for (const [key, cbs] of this._queue) {
    this._queue.delete(key);
    const data = JSON.stringify({key: key, val: this._docs[key]})+'\n';
    ++this._inFlightWrites;
    this._waitForDrain = !this._writeStream.write(data, (err) => {
      if (!cbs.length && err != null) this.emit('error', err);
      if (--this._inFlightWrites <= 0 && !this._waitForDrain) this.emit('drain');
      for (const cb of cbs) cb(err);
    });
    if (this._waitForDrain) break;
  }
  this._writeStream.uncork();
};
