var flock = require('..');
var assert = require('assert');

assert(flock.isWorker);

flock.worker.on('message', function(m) {
  if (commands[m.command]) commands[m.command](m);
});

var commands = {};

commands.listen =
function(command) {

  console.log('gonna listen');
  
  assert(command.port);
  var s = require('net').createServer();
  s.listen(command.port);
  s.once('listening', function() {
    flock.worker.send('listening');
    s.once('connection', function(socket) {
      socket.once('end', function() {
        process.exit();
      });
    });
  });
};