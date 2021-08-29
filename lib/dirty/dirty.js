'use strict';

const fs = require('fs');
const EventEmitter = require('events').EventEmitter;

class Dirty extends EventEmitter {
  constructor(path) {
    super();

    this.path = path;

    this._data = new Map();
    this._queue = new Map(); // Maps key to a list of callbacks.
    this._readStream = null;
    this._writeStream = null;
    this._waitForDrain = false;
    this._inFlightWrites = 0;

    this._load();
  }

  /**
   * set() stores a JSON object in the database at key
   * cb is fired when the data is persisted.
   * In memory, this is immediate - on disk, it will take some time.
   */
  set(key, val, cb) {
    if (val === undefined) {
      this._data.delete(key);
    } else {
      this._data.set(key, val);
    }
    if (this.path) {
      const cbs = this._queue.get(key) || [];
      if (cb) cbs.push(cb);
      this._queue.set(key, cbs);
      this._flush();
    } else {
      setImmediate(() => { if (cb) cb(); this.emit('drain'); });
    }
  }

  /**
   * Get the value stored at a key in the database
   * This is synchronous since a cache is maintained in-memory
   */
  get(key) {
    return this._data.get(key);
  }

  /**
   * Get total number of stored keys
   */
  size() {
    return this._data.size;
  }

  /**
   * Remove a key and the value stored there
   */
  rm(key, cb) {
    this.set(key, undefined, cb);
  }

  /**
   * Iterate over keys, applying match function
   */
  forEach(fn) {
    for (const [key, val] of this._data) {
      if (fn(key, val) === false) break;
    }
  }

  /**
   * Update the value stored at a key in the database.
   * This is synchronous since a cache is maintained in-memory
   * cb is passed as per Dirty.prototype.set
   */
  update(key, updater, cb) {
    this.set(key, updater(this.get(key)), cb);
  }

  /**
   * Close dirty db file streams
   */
  close() {
    if (this._queue.size || this._inFlightWrites > 0) {
      this.once('drain', () => this.close());
      return;
    }
    if (this._readStream) this._readStream.destroy();
    if (this._writeStream) this._writeStream.end(() => this._writeStream.destroy());
  }

  // Called when a dirty connection is instantiated
  _load() {
    let buffer = '';

    if (!this.path) {
      process.nextTick(() => {
        this.emit('load', 0);
      });
      return;
    }

    this._readStream = fs.createReadStream(this.path, {
      encoding: 'utf-8',
      flags: 'r',
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
          if (chunk.lastIndexOf('\n') === -1) return;
          const arr = buffer.split('\n');
          buffer = arr.pop();
          arr.forEach((rowStr) => {
            if (!rowStr) {
              this.emit('error', new Error('Empty lines never appear in a healthy database'));
              return;
            }

            let row;
            try {
              row = JSON.parse(rowStr);
              if (!('key' in row)) {
                throw new Error();
              }
            } catch (e) {
              this.emit('error', new Error(`Could not load corrupted row: ${rowStr}`));
              return '';
            }

            if (row.val === undefined) {
              this._data.delete(row.key);
            } else {
              this._data.set(row.key, row.val);
            }
            return '';
          });
        })
        .on('end', () => {
          if (buffer.length) {
            this.emit('error', new Error(`Corrupted row at the end of the db: ${buffer}`));
          }
          this.emit('load', this._data.size);
        })
        .on('close', () => {
          this._readStream = null;
          this.emit('read_close');
        });

    this._writeStream = fs.createWriteStream(this.path, {
      encoding: 'utf-8',
      flags: 'a',
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
  }

  _flush() {
    if (!this._queue.size || this._waitForDrain) return;
    this._writeStream.cork();
    for (const [key, cbs] of this._queue) {
      this._queue.delete(key);
      const data = `${JSON.stringify({key, val: this._data.get(key)})}\n`;
      ++this._inFlightWrites;
      this._waitForDrain = !this._writeStream.write(data, (err) => {
        if (!cbs.length && err != null) this.emit('error', err);
        if (--this._inFlightWrites <= 0 && !this._waitForDrain) this.emit('drain');
        for (const cb of cbs) cb(err);
      });
      if (this._waitForDrain) break;
    }
    this._writeStream.uncork();
  }
}

Dirty.Dirty = Dirty;
// Trap `apply` for backwards compatibility with callers that don't use `new`.
module.exports = exports = new Proxy(Dirty, {apply: (target, thisArg, args) => new Dirty(...args)});
