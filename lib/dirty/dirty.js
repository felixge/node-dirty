var Dirty = exports.Dirty = function() {
  this._docs = {};
};

Dirty.prototype.set = function(id, val) {
  this._docs[id] = val;
};

Dirty.prototype.get = function(id) {
  return this._docs[id];
};