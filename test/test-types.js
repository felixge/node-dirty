'use strict';

const config = require('./config');
const Dirty = require(config.LIB_DIRTY);
const assert = require('assert');

describe.skip('test-types', function () {
  let db;

  before(async function () { db = new Dirty(`${config.TMP_PATH}/test-types.dirty`); });

  describe('keys', function () {
    it('should prevent storage of an undefined key', async function () {
      db.set(undefined, 'value');
    });

    it('should not return an undefined key', async function () {
      assert(!db.get(undefined));
    });
  });
});
