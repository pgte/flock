var flock = require('..');
var assert = require('assert');
var utils = require('./_utils');

process.send('online');

flock.setupMaster({
  exec: __dirname + '/_worker.js'
});

var workers = [flock.fork(), flock.fork()];
var port = process.env.FLOCK_TEST_PORT || utils.randomPort();
var listening = 0;

workers.forEach(function(worker) {
  worker.send({command: 'listen', port: port});
  worker.once('message', function(m) {
    if (m != 'listening') return;
    listening ++;
    if (! process.env.FLOCK_TEST_RESTARTED && listening == workers.length) {
      var options = {
        FLOCK_TEST_RESTARTED: true,
        FLOCK_TEST_PORT: port
      };
      flock.restart(options, function(newMaster) {
        process.send({message: 'restarted', pid: newMaster.pid});
      });
    }
  });
});
