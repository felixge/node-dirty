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
    loading = false,
    flushing = false,
    readStream = fs.createReadStream(filePath),
    writeStream = fs.createWriteStream(filePath, {flags: 'a+'}),
    readBuffer = '',
    timer;

  readStream
    .addListener('error', function(err) {
      // No such file or directory
      if (err.errno == 2) {
        self.emit('load');
        return;
      }
      self.emit('error', err);
    })
    .addListener('data', function(chunk) {
      var
        offset,
        chunk,
        doc;

      readBuffer += chunk;

      while ((offset = readBuffer.indexOf("\n")) > -1) {
        chunk = readBuffer.substr(0, offset);
        readBuffer = readBuffer.substr(offset+1);

        try {
          doc = JSON.parse(chunk);
        } catch (e) {
          continue;
        }

        if (doc.deleted) {
          delete docs[doc.id];
        } else {
          docs[doc.id] = doc.value;
        }
      }
    })
    .addListener('end', function() {
      self.emit('load');
    });

  writeStream
    .addListener('drain', function() {
      if (!log.length) {
        self.emit('drain');
      }
    })
    .addListener('error', function(err) {
      self.emit('error', err);
    });

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

    if (loading === true) {
      // Do not flush while loading
    } else if (options.flushLimit && !flushing && log.length >= options.flushLimit) {
      this.flush();
      if (timer) {
        clearTimeout(timer);
      }
    } else if (options.flushInterval && !flushing && !timer) {
      timer = setTimeout(function() {
        self.flush();
        timer = null;
      }, options.flushInterval);
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

      writeStream.write(chunk, function(err) {
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
};
sys.inherits(Dirty, events.EventEmitter);