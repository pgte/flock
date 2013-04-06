var test = require('tap').test;
var assert = require('assert');
var fork = require('child_process').fork;
var exec = require('child_process').exec;
var flock = require('..');
var utils = require('./_utils');

flock.setupMaster({
  exec: __dirname + '/_worker.js'
});

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
return;


test('flock.isMaster works', function(t) {
  t.ok(flock.isMaster);
  t.end();
});

test('master forks workers', function(t) {
  var worker = flock.fork();
  worker.once('online', function() {
    worker.kill();
    worker.once('exit', function() {
      t.end();
    });
  });  
});

test('master forks 2 workers that listen', function(t) {
  t.plan(2);

  var workers = [flock.fork(), flock.fork()];
  var port = utils.randomPort();
  workers.forEach(function(worker) {
    worker.send({command: 'listen', port: port});
    worker.once('message', function(m) {
      console.log('worker sent message', m);
      assert(m == 'listening');
      worker.kill();
      worker.once('exit', function() {
        t.ok(true, 'worker exited');
      });
    });
  });
});

///---