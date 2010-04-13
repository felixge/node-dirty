var Dirty = exports.Dirty = function() {
  this._docs = {};
};

Dirty.prototype.set = function(key, val) {
  this._docs[key] = val;
};