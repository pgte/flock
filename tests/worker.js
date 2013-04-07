var test = require('tap').test;
var flock = require('..');
var utils = require('./_utils');
var net = require('net');

flock.setupMaster({
  exec: __dirname + '/_worker.js'
});

test('worker can listen', function(t) {
  var worker = flock.fork();
  worker.once('online', function() {

    var port = utils.randomPort();
    
    worker.send({command: 'listen', port: port});

    worker.once('listening', function(listenData) {
      t.equal(listenData.address, '0.0.0.0');
      t.equal(listenData.port, port);
      var socket = net.connect(port, function() {
        socket.end();
        worker.once('exit', function() {
          t.end();
        });
      });
    });
  });  
});