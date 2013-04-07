var test = require('tap').test;
var flock = require('..');

flock.setupMaster({
  exec: __dirname + '/_worker.js'
});


test('flock.isMaster works', function(t) {
  t.ok(flock.isMaster);
  t.end();
});
