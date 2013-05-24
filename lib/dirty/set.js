function Set(initial) {
  this._items = {};
  this._length = 0;
  (initial || []).forEach(function(item){
    this.add(item);
  }, this);
}

Set.prototype.add = function(item) {
  if (!this.contains(item)) this._length++;
  this._items[item] = true;
  return this;
}

Set.prototype.push = Set.prototype.add;

Set.prototype.empty = function() {
  return this._length === 0;
}

Set.prototype.contains = function(item) {
  return this._items.hasOwnProperty(item);
}

Set.prototype.remove = function(item) {
  if (this.contains(item)) this._length--;
  delete this._items[item];
  return this;
}

Set.prototype.toArray = function() {
  var retVal = [];
  for (var item in this._items) {
    if (this.contains(item)) retVal.push(item);
  }
  return retVal;
}

Set.prototype.difference = function(other, returnArray) {
  var result = returnArray ? [] : new Set();
  for (var item in this._items) {
    if (this.contains(item) && !other.contains(item)) result.push(item);
  }
  return result;
}

Set.prototype.__defineGetter__("length", function(){
  return this._length;
});


module.exports = Set;