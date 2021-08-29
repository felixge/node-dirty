'use strict';

const config = require('./config');
const Dirty = require(config.LIB_DIRTY);
const assert = require('assert');

describe('test-load-event', function () {
  it('should fire load event', function (done) {
    const db = new Dirty();

    db.on('load', () => {
      done();
    });
  });
});

describe('test-set-callback', function () {
  it('should trigger callback on set', function (done) {
    const db = new Dirty();
    let foo = '';

    db.set('foo', 'bar', () => {
      foo = db.get('foo');
      assert.equal(foo, 'bar');
      done();
    });
  });
});
