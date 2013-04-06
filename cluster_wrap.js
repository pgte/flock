var cluster = require('cluster');
var extend = require('util')._extend;
var assert = require('assert');

var debug = require('./debug')('worker ' + cluster.worker.id);

var INTERNAL_PREFIX = 'FLOCK_INTERNAL_';

function internalMessage(inMessage) {
  var outMessage = extend({}, inMessage);

  // Add internal prefix to cmd
  outMessage.cmd = INTERNAL_PREFIX + (outMessage.cmd || '');

  return outMessage;
}


function sendInternalMessage(worker, message, handler) {

  debug('sending internal message to master: %j. has handler: %j', message, !!handler);

  // Exist callback
  var callback = arguments[arguments.length - 1];
  if (typeof callback !== 'function') {
    callback = undefined;
  }

  // exist handler
  var handler = arguments[2] !== callback ? arguments[2] : undefined;

  message = internalMessage(message);

  worker.send(message, handler);
}

/// Wrap the living daylights of cluster._getServer,
/// which is used by net and udp when in cluster mode.

cluster._getServer =
function _getServer(tcpSelf, address, port, addressType, fd, cb) {
  assert(cluster.isWorker);

  ///throw new Error('ghaaaa address:' + address + ' port:' + port);

  debug('cluster._getServer: %j', arguments);

  var worker = cluster.worker;

  // Send a listening message to the master
  tcpSelf.once('listening', function() {
    worker.state = 'listening';
    sendInternalMessage(worker, {
      cmd: 'listening',
      address: address,
      port: tcpSelf.address().port || port,
      addressType: addressType,
      fd: fd
    });
  });

  // Request the fd handler from the master process
  var message = {
    cmd: 'queryServer',
    address: address,
    port: port,
    addressType: addressType,
    fd: fd
  };


  // The callback will be stored until the master has responded
  sendInternalMessage(worker, message);

  function handleWorkerMessage(message, handle) {
    debug('got message %j. has handle: %j', message, !! handle);
    if (message && message.cmd == 'FLOCK_INTERNAL_serverHandle' &&
        message.address == address &&
        message.port == port &&
        message.addressType == addressType &&
        message.fd == fd) {
      
      assert(handle);
      worker.removeListener('message', handleWorkerMessage);
      cb(handle);
    }
  }

  worker.on('message', handleWorkerMessage);
};