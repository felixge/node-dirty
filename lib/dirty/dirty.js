var Dirty = exports.Dirty = function(path) {
  if (!(this instanceof Dirty)) return new Dirty(path);

  this.path = path;
  this._docs = {};

  this.load();
};
Dirty.Dirty = Dirty;
module.exports = Dirty;

Dirty.prototype.load = function() {

};

Dirty.prototype.set = function(key, val) {
  this._docs[key] = val;
};

Dirty.prototype.get = function(key) {
  return this._docs[key];
};
