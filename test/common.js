var path = require('path');
require.paths.unshift(path.dirname(__dirname)+'/lib');

global.assert = require('assert');
global.Gently = require('gently');
global.GENTLY = new Gently();
