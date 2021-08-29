'use strict';

const config = require('./config');
const fsp = require('fs').promises;
const Dirty = require(config.LIB_DIRTY);
const events = require('events');
const assert = require('assert');

const dirtyAPITests = (file) => {
  const mode = (file) ? 'persistent' : 'transient';

  describe(`dirty api (${mode} mode)`, function () {
    const cleanup = async () => {
      try {
        await fsp.unlink(file);
      } catch (err) { /* intentionally ignored */ }
    };

    before(cleanup);

    it('constructor without new', async function () {
      const db = Dirty(file); // eslint-disable-line new-cap
      assert(db instanceof Dirty);
      await cleanup();
    });

    describe('dirty constructor', function () {
      let db;

      before(async function () { db = new Dirty(file); });
      after(cleanup);

      it('is an event emitter', async function () {
        assert.ok(db instanceof events.EventEmitter);
      });

      it('is a dirty', async function () {
        assert.ok(db instanceof Dirty);
      });
    });

    describe('events', function () {
      afterEach(cleanup);

      it('should fire load', function (done) {
        const db = new Dirty(file);
        db.on('load', (length) => {
          assert.strictEqual(length, 0);
          done();
        });
      });

      it('should fire drain after write', function (done) {
        const db = new Dirty(file);
        db.on('load', (length) => {
          assert.strictEqual(length, 0);

          db.set('key', 'value');
          db.on('drain', () => {
            done();
          });
        });
      });
    });

    describe('accessors', function (done) {
      after(cleanup);
      let db;

      it('.set should trigger callback', function (done) {
        db = new Dirty(file);
        db.set('key', 'value', (err) => {
          assert.ok(!err);
          done();
        });
      });

      it('.get should return value', async function () {
        assert.strictEqual(db.get('key'), 'value');
      });

      it('.path is valid', async function () {
        assert.strictEqual(db.path, file);
      });

      it('.forEach runs for all', async function () {
        const total = 2; let
          count = 0;
        db.set('key1', 'value1');
        db.set('delete', 'me');

        db.rm('delete');

        const keys = ['key', 'key1'];
        const vals = ['value', 'value1'];

        db.forEach((key, val) => {
          assert.strictEqual(key, keys[count]);
          assert.strictEqual(val, vals[count]);

          count++;
        });

        assert.strictEqual(count, total);
      });

      it('.rm removes key/value pair', async function () {
        db.set('test', 'test');
        assert.strictEqual(db.get('test'), 'test');
        db.rm('test');
        assert.strictEqual(db.get('test'), undefined);
      });

      it('.rm of unknown key is a no-op', async function () {
        db.rm('does not exist');
        const got = [];
        db.forEach((k, v) => { got.push([k, v]); });
        assert.deepStrictEqual(got, [['key', 'value'], ['key1', 'value1']]);
      });

      it('will reload file from disk', function (done) {
        if (!file) {
          console.log('N/A in transient mode');
          return done();
        }

        db = new Dirty(file);
        db.on('load', (length) => {
          assert.strictEqual(length, 2);
          assert.strictEqual(db.get('key'), 'value');
          assert.strictEqual(db.get('key1'), 'value1');
          const got = [];
          db.forEach((k, v) => { got.push([k, v]); });
          assert.deepStrictEqual(got, [['key', 'value'], ['key1', 'value1']]);
          done();
        });
      });
    });

    describe('db file close', function () {
      after(cleanup);

      it('close', function (done) {
        if (!file) {
          console.log('N/A in transient mode');
          return done();
        }
        const db = new Dirty(file);
        db.on('load', (length) => {
          db.set('close', 'close');
          db.on('drain', () => {
            db.close();
          });
        });

        db.on('write_close', () => {
          done();
        });
      });
    });
  });
};

dirtyAPITests('');
dirtyAPITests(`${config.TMP_PATH}/apitest.dirty`);
