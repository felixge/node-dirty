#EDITS

This is a fork of node-dirty with the following abilities added.

* A Compacting function
* Custom Indexes

# node-dirty

## Purpose

A tiny & fast key value store with append-only disk log. Ideal for apps with < 1 million records.

## Installation

    npm install dirty

## Why dirty?

This module is called dirty because:

* The file format is newline separated JSON
* Your database lives in the same process as your application, they share memory
* There is no query language, you just `forEach` through all records

So dirty means that you will hit a very hard wall with this database after ~1 million records,
but it is a wonderful solution for anything smaller than that.

## Tutorial

    require('../test/common');
    var db = require('dirty')('user.db');

    db.on('load', function() {
      db.set('john', {eyes: 'blue'});
      console.log('Added john, he has %s eyes.', db.get('john').eyes);

      db.set('bob', {eyes: 'brown'}, function() {
        console.log('User bob is now saved on disk.')
      });

      db.forEach(function(key, val) {
        console.log('Found key: %s, val: %j', key, val);
      });
    });

    db.on('drain', function() {
      console.log('All records are saved on disk now.');
    });

Output:

    Added john, he has blue eyes.
    Found key: john, val: {"eyes":"blue"}
    Found key: bob, val: {"eyes":"brown"}
    User bob is now saved on disk.
    All records are saved on disk now.

## API

### new Dirty([path])

Creates a new dirty database. If `path` does not exist yet, it is created. You
can also omit the `path` if you don't want disk persistence (useful for testing).

The constructor can be invoked in multiple ways:

    require('dirty')('my.db');
    require('dirty').Dirty('my.db');
    new (require('dirty'))('my.db');
    new (require('dirty').Dirty)('my.db');

### dirty.path

The path of the dirty database.

### dirty.set(key, value, [cb])

Set's the given `key` / `val` pair. The state of the database is affected instantly,
the optional `cb` callback is fired when the record was written to disk.

`val` can be any JSON-serializable type, it does not have to be an object.

### dirty.get(key)

Retrieves the value for the given `key`.

### dirty.rm(key, cb)

Removes the record with the given `key`. This is identical to setting the `key`'s value
to `undefined`.

### dirty.forEach(fn)

Calls the given `fn` function for every document in the database. The passed
arguments are `key` and `val`. You can return `false` to abort a query (useful
if you are only interested in a limited number of records).

This function is blocking and runs at ~4 Mhz.

### dirty event: 'load' (length)

Emitted once the database file has finished loading. It is not safe to access
records before this event fires. Writing records however should be fine.

`length` is the amount of records the database is holding. This only counts each
key once, even if it had been overwritten.

### dirty event: 'drain' ()

Emitted whenever all records have been written to disk.

### dirty.compact()

Compacts the database and gets rid of all redundant rows. It creates a new file to write to and then overwrites the existing file if it successfully writes it out. Use this when your system has some idle cycles. This should make load much faster.

### dirty.addCompactingFilter(filter)

Used while compacting the database and gets RID of any row that's matched by the filter (filter returns true). This is useful if you want to use the compacting run to clean up the database of stale data (like old database sessions). These filters are not persisted. You have to re-add them everytime the app starts.
filter is function(key, value);

### dirty event: 'compacted'

Emitted once compacting is complete if you start a compact run and succeeds.

### dirty event: 'compactingError'

Emitted once compacting is complete if you start a compact run and it fails. When this happens the in memory store will be inconsistent with the database on file. The memory store will no longer contain any rows that were filtered out by the compacting filter. But these rows will still be in the database. Ideally, since the filters are for removing stale rows that aren't harmful, this shouldn't matter. 




## License

node-dirty is licensed under the MIT license.
