'use strict';

// eslint-disable-next-line node/no-missing-require
const Dirty = require('dirty');
const path = require('path');

const db = new Dirty(path.join(__dirname, 'bob.dirty'));

db.on('load', () => {
  db.set('john', {eyes: 'blue'});
  console.log('Added john, he has %s eyes.', db.get('john').eyes);

  db.set('bob', {eyes: 'brown'}, () => {
    console.log('User bob is now saved on disk.');
  });

  db.forEach((key, val) => {
    console.log('Found key: %s, val: %j', key, val);
  });
});

db.on('drain', () => {
  console.log('All records are saved on disk now.');
});
