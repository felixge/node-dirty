'use strict';

const packageJson = require('../package.json');

module.exports = {
  env: {
    mocha: true,
  },
  plugins: [
    'mocha',
  ],
  rules: {
    'mocha/no-hooks-for-single-case': 'off',
    'mocha/no-return-from-async': 'error',
    'mocha/no-synchronous-tests': 'error',
    'mocha/prefer-arrow-callback': 'error',
    'node/no-unpublished-require': ['error', {
      allowModules: Object.keys(packageJson.devDependencies || {}),
    }],
    'prefer-arrow-callback': 'off',
    'prefer-arrow/prefer-arrow-functions': 'off',
  },
};
