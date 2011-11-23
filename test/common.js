var path = require('path'), fs = require('fs');

global.ROOT_DIR = path.dirname(__dirname);
global.TEST_TMP = path.join(__dirname, 'tmp');
global.ROOT_LIB  = path.join(global.ROOT_DIR, 'lib', 'dirty');
global.assert = require('assert');
global.Gently = require('gently');
global.GENTLY = new Gently();
global.HIJACKED = GENTLY.hijacked;

fs.readdirSync(TEST_TMP).forEach(function(file) {
  if (!file.match(/\.dirty$/)) {
    return;
  }

  fs.unlinkSync(TEST_TMP+'/'+file);
});
