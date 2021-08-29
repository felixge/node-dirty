'use strict';

const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');

const TMP_PATH = path.join(__dirname, 'tmp');
const LIB_DIRTY = path.join(__dirname, '../lib/dirty');

rimraf.sync(TMP_PATH);
fs.mkdirSync(TMP_PATH);

module.exports = {
  TMP_PATH,
  LIB_DIRTY,
};
