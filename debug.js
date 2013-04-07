var slice = Array.prototype.slice;

function noop() {}

var debug = noop;

if (process.env.FLOCK_DEBUG) {
  debug =
  function debug() {
    var prefix = '[FLOCK] ';
    arguments[0] = prefix + arguments[0];
    console.log.apply(console, arguments);
  }
}

var Debug =
exports =
module.exports =
function Debug(scope) {
  var prefix = '[' + scope + '] ';
  return function _debug() {
    arguments[0] = prefix + arguments[0];
    debug.apply(null, arguments);
  }
};

exports.figureOutContext =
function figureOutContext() {
  var cluster = require('cluster');

  var prefix = cluster.isMaster ? ('master ' + process.pid) : ('worker ' + cluster.worker.id);
  return Debug(prefix);
}