var cluster = require('cluster');
var extend = require('util')._extend;
var assert = require('assert');

var messages = require('../messages');
var worker = cluster.worker;
var debug = require('../debug')('worker ' + worker.id);

var TIMEOUT = 5000; /// TODO: put this in a customizable option

/// Wrap the living daylights of cluster._getServer,
/// which is used by net and udp when in cluster mode.

cluster._getServer =
function _getServer(tcpSelf, address, port, addressType, fd, cb) {
  assert(cluster.isWorker);

  ///throw new Error('ghaaaa address:' + address + ' port:' + port);

  debug('cluster._getServer: %j', arguments);

  // Send a listening message to the master
  tcpSelf.once('listening', function() {
    worker.state = 'listening';
    messages.sendInternal({
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

  messages.sendInternal(message);

  waitForServerHandle(); //:
  
  function waitForServerHandle() {
    messages.wait(worker, 'serverHandle', TIMEOUT, function(message, handle) {
      if (message.address == address &&
          message.port == port &&
          message.addressType == addressType &&
          message.fd == fd) {
        
        assert(handle);
        debug('got server handle for address %s, port %d', address, port);
        cb(handle);
      } else {
        waitForServerHandle();
      }
    }, function() {
      console.error('[worker %d] timeout: did not get server handle.', worker.id);
    });
  }
};