var EventEmitter = require('events').EventEmitter;
var propagate = require('propagate');

var messages = require('../messages');

var AUTO_PROPAGATED_WORKER_EVENTS = [
  'online',
  'listening',
  'disconnect',
  'exit'
];


exports.wrap = 
function wrap(worker) {
  var w = new EventEmitter();

  propagate(AUTO_PROPAGATED_WORKER_EVENTS, worker, w);

  worker.on('message', function(message, handle) {
    if (! messages.isInternal(message)) w.emit('message', message, handle);
  });

  w.id = worker.id;
  w.process = worker.process;
  w.send = worker.send.bind(worker);
  w.kill = worker.kill.bind(worker);
  w.disconnect = worker.disconnect.bind(worker);

  return w;
};