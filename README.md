# Dirty - NoSQL for the little man

A key value store for [node.js](http://nodejs.org/) that is simple, fast & dirty.

Dirty stores all documents in memory like [Redis](http://code.google.com/p/redis/) while allowing you to iterate over them in JavaScript similar to [CouchDB](http://couchdb.apache.org/).

## What makes dirty dirty?

* It is the minimal viable key value store (< 250 LoC)
* You embedded it into your actual applications
* The db format is append only newline separated JSON
* No network support out of the box (seriously)
* It can only store js objects, primitives and arrays need to be wrapped in an object

## The big picture

Key-value stores are stupid by design. You ask them trivial questions like "What is the value of key X?" and they are pretty fast and good with answering those.

However, beyond caching, those are not the kind of questions you want to ask your database. And you certainly don't want to find the answer by asking tons of trivial questions over a network, just to compute the final result on the client side. It's not good for your network nor a lot of fun to do.

Yes, some key-value stores will offer you some sort of "query" language or ways to pre-compute answers to frequently asked questions. But honestly, those are doomed to suffer from the same problems as relational databases or will be limited in the complexity of the questions they can answer.

How does dirty avoid those problems? By cheating. It avoids the whole network trouble by simply not shipping with a network interface. This discourages asking dirty trivial questions over a network. The need for a query language is avoided giving you access to the raw data using JavaScript.

Dirty allows people to build their very own, very fast databases that do exactly what they need and nothing else. Making those high-level databases available to your system is trivial, you just create a REST service with node. As an extra, you can also use node's non-blocking I/O to query other datasources.

## Examples

### Create database with 2 documents:

    var
      Dirty = require('../lib/dirty').Dirty,
      posts = new Dirty('test.dirty');

    posts.add({hello: 'dirty world!'});
    posts.set('my-id', {looks: 'nice'});

Output:

    $ node example1.js
    $ cat test.dirty 
    {"hello":"dirty world!","_id":"3b8f86684573afd0b4ceba34f7b0566e"}
    {"looks":"nice","_id":"my-id"}

### Reload the database from disk

    var
      Dirty = require('../lib/dirty').Dirty,
      posts = new Dirty('test.dirty');

    posts.load()
      .addCallback(function() {
        p(posts.get('my-id'));
      });

Output:

    $ node example2.js
    {"looks": "nice", "_id": "my-id"}

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
    [{"hello": "dirty world!", "_id": "3b8f86684573afd0b4ceba34f7b0566e"}]

That's it! No more features. Dirty is quite minimal. It encourages you to use it in a lego-style fashion.

## API Documentation

### new Dirty([filename, options])

Creates a new dirty database. If `filename` does not exist, a new file is created. If `filename` is not specified, dirty operates in-memory only (useful for testing).

The default `options` are:

    {
      flushInterval: 10,
      flushLimit: 1000,
    }

This means that documents are written to disk in bulks of 100 or after 10ms, whichever occurs first.

### Dirty.length

Returns how many documents are currently loaded.

### Dirty.load()

Returns a promise that finishes once all records have been read from the current database.

You can already start querying or using a partially loaded database. However, documents overwrite their ids as they are loaded, so be careful.

### Dirty.close()

Properly closes the database file and removes any remaining timers.

### Dirty.add(doc, [callback])

Adds a new document to the database and assigns it a uuid as the id.

`doc` needs to be a JavaScript object. Other data types are not allowed, but can be included inside the object as far as they can be serialized to JSON.

`callback` is an optional function that is called once the document has been written to disk.

The function returns the uuid created for the record. It also modifies the `doc` object that is being passed in by adding a `_id` property.

Example:

    var doc = {hello: 'world'};
    var uuid = db.add(doc);
    p(uuid); // "3b8f86684573afd0b4ceba34f7b0566e"
    p(doc._id == uuid); // true

### Dirty.set(id, doc, [callback])

Identical to `Dirty.add()` except:

* `id` is used instead of a uuid
* The function has no return value

### Dirty.remove(id, [callback])

Removes given `id` and fires `callback` once the change has flushed to disk.

**Important:** A removed id will show up in `Dirty.fiter()` as `{_deleted: true}` until it has been removed from disk.

### Dirty.get(id)

Returns the object for the given id or `undefined` if it is not set.

### Dirty.filter(callback)

Calls `callback` for each document in the database with `doc` as the first parameter. Returns an array with all docs for which `callback` returns a `true`ish value.

Example:

    posts.add({title: 'cool post'});
    posts.add({title: 'awesome post'});

    var docs = posts.filter(function(doc) {
      return doc.title.match(/awesome/);
    });
    p(docs); // [{"title": "awesome post", "_id": "2895ed039b68455e23a202627537030c"}]

### Dirty.flush()

Flushes all documents to disk that are only stored in memory at that point. Returns a promise that finishes once those records have been written to disk.

### Dirty.addListener('flush', callback)

The `'flush'` event is emitted whenever the database gets into full sync with its disk file. This is not the same event as the promise returned by `Dirty.flush()`, it guarantees full sync while the flush promise merely guarantees a previous state to have fully flushed.

## Benchmarks

dirty ships with a small set of benchmarks which can be invoked by running `make benchmark`. On my eager laptop the output usually looks like this:

    $ make benchmark
    node benchmark/filter.js
    763000 docs added in 1030ms
    flushed to disc, starting filtering ...

    Filtered 14497000 docs in 1026 ms 	(14129630 per sec)
    node benchmark/set.js
    MEMORY: 763000 writes in 1031 ms 	(740058 per sec)
    DISK:   763000 writes in 14.68 sec 	(51965 per sec)

Explanation:

* `filter.js` adds as many records in 1000ms as possible (like `set.js`), and then iterates over them for 1000ms filtering out 50% of the items and outputs the results.
* `set.js` uses the `Dirty.set()` method to add as many objects to the database as possible for 1000ms and outputs the results

That is not a very realistic load scenario and not really comparable to other stores that do much more (like networking). If anything, you can learn that I care about the performance of dirty by providing a benchmark as part of the distribution.

Make sure to read [Benchmarks: You are Doing it Wrong][1] by [@janl][2] if you're interested in doing some benchmarking of your own.

[1]: http://jan.prima.de/plok/archives/175-Benchmarks-You-are-Doing-it-Wrong.html
[2]: https://twitter.com/janl

## License

Dirty is licensed under the MIT license.