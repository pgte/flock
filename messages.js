var debug = require('./debug').figureOutContext();

/// Send Internal Message

var PREFIX = '_FLOCK_CLUSTER_'

/// .sendInternal()

exports.sendInternal =
function sendInternalMessage(m) {
  if (typeof m == 'string') m = PREFIX + m;
  else m.cmd = PREFIX + m.cmd;
  
  debug('sending internal message to original master %j', m)
  process.send(m);
};


/// .send()

exports.send =
function send(worker, m, handle) {
  if (typeof m == 'string') m = PREFIX + m;
  else m.cmd = PREFIX + m.cmd;

  debug('sending message to worker %d: %j. has handle: %j', worker.id, m, !! handle);
  worker.send(m, handle);
};

/// .wait()

exports.wait =
function wait(worker, message, timeout, cb, timeoutCb) {

  message = PREFIX + message;
  
  var timer;
  if (timeout > 0) {
    timer = setTimeout(function() {
      timer = undefined;
      cleanup();
      if (timeoutCb) timeoutCb();
      else throw new Error('Timeout on waiting for message ' + message + ' on worker ' + worker.id);
    }, timeout);
  }

  function cleanup() {
    if (timer) clearTimeout(timer);
    worker.removeListener('message', messageListener);
  }

  function messageListener(m, handle) {
    if (typeof m == 'string' && m == message ||
        m.cmd == message)
    {
      cleanup();
      cb(m, handle);
    }
  }
  worker.on('message', messageListener);
};


/// .isInternal()

exports.isInternal =
function isInternal(m) {
  if (typeof m == 'object') m = m.cmd;
  return m.indexOf(PREFIX === 0);
};