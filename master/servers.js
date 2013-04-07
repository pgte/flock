var net = require('net');
var debug = require('../debug').figureOutContext();

var serverHandlers = {};

exports.getServer =
function(address, port, addressType, fd) {
  var args = [address,
              port,
              addressType,
              fd];
  var key = args.join(':');
  var handler;

  if (serverHandlers.hasOwnProperty(key)) {
   handler = serverHandlers[key];
  } else if (addressType === 'udp4' ||
            addressType === 'udp6') {
   var dgram = require('dgram');
   handler = dgram._createSocketHandle.apply(net, args);
   serverHandlers[key] = handler;
  } else {
   handler = net._createServerHandle.apply(net, args);
   serverHandlers[key] = handler;
  }

  debug('constructed handle: %j', handler);

  return handler;
};