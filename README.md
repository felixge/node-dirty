# Dirty - NoSQL for the little man

A key value store for [node.js](http://nodejs.org/) that is simple, fast & dirty.

## What makes dirty dirty?

* It is the minimal viable key value store (< 200 LoC)
* You embedded it into your actual applications
* The database format is newline separated JSON
* No network support out of the box (seriously)
* It can only store js objects, primitives and arrays need to be wrapped in an object

## Examples

### Create database with 2 documents:

    var
      Dirty = require('../lib/dirty').Dirty,
      posts = new Dirty('test.dirty');

    posts.add({hello: 'dirty world!'});
    posts.set('my-key', {looks: 'nice'});

Output:

    $ node example1.js
    $ cat test.dirty 
    {"hello":"dirty world!","_key":"3b8f86684573afd0b4ceba34f7b0566e"}
    {"looks":"nice","_key":"my-key"}

### Reload the database from disk

    var
      Dirty = require('../lib/dirty').Dirty,
      posts = new Dirty('test.dirty');

    posts.load()
      .addCallback(function() {
        p(posts.get('my-key'));
      });

Output:

    $ node example2.js
    {"looks": "nice", "_key": "my-key"}

### Filter documents from the db

    var
      Dirty = require('../lib/dirty').Dirty,
      posts = new Dirty('test.dirty');

    posts.load()
      .addCallback(function() {
        var docs = posts.filter(function(doc) {
          return ('hello' in doc);
        });
        p(docs);
      });

Output:

    $ node hello.js
    [{"hello": "dirty world!", "_key": "3b8f86684573afd0b4ceba34f7b0566e"}]

That's it! No more features. Dirty is quite minimal. It encourages you to use it in a lego-style fashion.

## API Documentation

### new Dirty(filename, [options])

Creates a new dirty database. If `filename` does not exist, a new file is created.

The default `options` are:

    {
      flushInterval: 10,
      flushLimit: 100,
    }

This means that documents are written to disk in bulks of 100 or after 10ms, whichever occurs first.

### Dirty.length

Returns how many documents are currently loaded.

### Dirty.load()

Returns a promise that finishes once all records have been read from the current database.

You can already start querying or using a partially loaded database. However, documents overwrite their keys as they are loaded, so be careful.

### Dirty.close()

Properly closes the database file and removes any remaining timers.

### Dirty.add(doc, [callback])

Adds a new document to the database and assigns it a uuid as the key.

`doc` needs to be a JavaScript object. Other data types are not allowed, but can be included inside the object as far as they can be serialized to JSON.

`callback` is an optional function that is called once the document has been written to disk.

The function returns the uuid created for the record. It also modifies the `doc` object that is being passed in by adding a `_key` property.

Example:

    var doc = {hello: 'world'};
    var uuid = db.add(doc);
    p(uuid); // "3b8f86684573afd0b4ceba34f7b0566e"
    p(doc._key == uuid); // true

### Dirty.set(key, doc, [callback])

Identical to `Dirty.add()` except:

* `key` is used instead of a uuid
* The function has no return value

### Dirty.get(key)

Returns the object for the given key or `undefined` if it is not set.

### Dirty.filter(callback)

Calls `callback` for each document in the database with `doc` as the first parameter. Returns an array with all docs for which `callback` returns a `true`ish value.

Example:

    posts.add({title: 'cool post'});
    posts.add({title: 'awesome post'});

    var docs = posts.filter(function(doc) {
      return doc.title.match(/awesome/);
    });
    p(docs); // [{"title": "awesome post", "_key": "2895ed039b68455e23a202627537030c"}]

### Dirty.flush()

Flushes all documents to disk that are only stored in memory at that point. Returns a promise that finishes once those records have been written to disk.

### Dirty.addListener('flush', callback)

The `'flush'` event is emitted whenever the database gets into full sync with its disk file. This is not the same event as the promise returned by `Dirty.flush()`, it guarantees full sync while the flush promise merely guarantees a previous state to have fully flushed.

## Benchmarks

dirty ships with a small set of benchmarks which can be invoked by running `make benchmark`. On my eager laptop the output usually looks like this for me:

    $ make benchmark
    find benchmark/*.js | xargs -n 1 -t node
    node benchmark/filter.js
    103000 docs added in 1004ms
    flushed to disc, starting filtering ...

    Filtered 13493000 docs in 1011 ms 	(13346192 per sec)
    node benchmark/set.js
    MEMORY: 106000 writes in 1055 ms 	(100474 per sec)
    DISK:   106000 writes in 1.51 sec 	(70013 per sec)

Explanation:

* `filter.js` adds as many records in 1000ms as possible (like `set.js`), and then iterates over them for 1000ms filtering out 50% of the items and outputs the results.
* `set.js` uses the `Dirty.set()` method to add objects to the database as possible for 1000ms and outputs the results

That is not a very realistic load scenario and not really comparable to other stores that do much more (like networking). If anything, you can learn that I care about the performance of dirty by providing a benchmark as part of the distribution.

Make sure to read [Benchmarks: You are Doing it Wrong][1] by [@janl][2] if you're interested in doing some benchmarking of your own.

[1]: http://jan.prima.de/plok/archives/175-Benchmarks-You-are-Doing-it-Wrong.html
[2]: https://twitter.com/janl

## License

Dirty is licensed under the MIT license.