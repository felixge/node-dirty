const config = require('./config');
const fs = require('fs');
const Dirty = require(config.LIB_DIRTY);
const assert = require('assert');

describe.skip('test-types', function () {
  const db = new Dirty(`${config.TMP_PATH}/test-types.dirty`);

  describe('keys', function () {
    it('should prevent storage of an undefined key', function () {
      db.set(undefined, 'value');
    });

    it('should not return an undefined key', function () {
      assert(!db.get(undefined));
    });
  });
});
