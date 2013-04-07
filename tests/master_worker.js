var test = require('tap').test;
var flock = require('..');
var assert = require('assert');
var fork = require('child_process').fork;
var exec = require('child_process').exec;
var utils = require('./_utils');

flock.setupMaster({
  exec: __dirname + '/_worker.js'
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
    worker.once('listening', function(m) {
      worker.kill();
      worker.once('exit', function() {
        t.ok(true, 'worker exited');
      });
    });
  });
});
