var test = require('tap').test;
var flock = require('..');
var assert = require('assert');
var fork = require('child_process').fork;
var exec = require('child_process').exec;
var utils = require('./_utils');


test('can restart master with 2 active workers listening', function(t) {
  var master = fork(__dirname + '/_master');

  master.once('message', function(m) {
    t.equal(m, 'online');
    master.once('message', function(m) {
      console.log('got message from master:', m);
      t.equal(m.message, 'restarted');
      t.ok(!! m.pid);
      master.once('exit', function() {
        console.log('master exited');
        exec('kill ' + m.pid, function(err, so, se) {
          t.ok(! err);
          t.ok(! se);
          t.end();
        });
      });
    });
  });

});