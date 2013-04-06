var EventEmitter = require('events').EventEmitter;
var cluster = require('cluster');
var fork = require('child_process').fork;
var propagate = require('propagate');
var extend = require('util')._extend;
var assert = require('assert');
var net = require('net');

var debug = require('./debug')('master ' + process.pid);

debug('new master', process.pid);

var Master =
exports =
module.exports =
new EventEmitter();

propagate(cluster, Master);

Master.isMaster = true;
Master.isWorker = false;


/// Setup Master

Master.setupMaster =
function setupMaster(settings) {
  cluster.setupMaster.apply(cluster, arguments);
};


/// Fork

var serverHandlers = {};

function workerInit(worker) {
  worker.on('message', function(message) {
    debug('message from worker %d: %j', worker.id, message);
    if (message.cmd == 'FLOCK_INTERNAL_queryServer') {

      var args = [message.address,
                 message.port,
                 message.addressType,
                 message.fd];
      var key = args.join(':');
      var handler;

      if (serverHandlers.hasOwnProperty(key)) {
       handler = serverHandlers[key];
      } else if (message.addressType === 'udp4' ||
                message.addressType === 'udp6') {
       var dgram = require('dgram');
       handler = dgram._createSocketHandle.apply(net, args);
       serverHandlers[key] = handler;
      } else {
       handler = net._createServerHandle.apply(net, args);
       serverHandlers[key] = handler;
      }

      debug('constructed handle: %j', handler);

      // echo callback with the fd handler associated with it
      worker.send({
        cmd: 'FLOCK_INTERNAL_serverHandle',
        address:     message.address,
        port:        message.port,
        addressType: message.addressType,
        fd:          message.fd
      }, handler);
    }
  });
}

Master.fork =
function fork() {
  debug('fork with arguments %j', arguments);
  var worker = cluster.fork.apply(cluster, arguments);
  workerInit(worker);
  return worker;
};


/// Restart

function killAllWorkers(cb) {
  debug('killing all workers');
  var workerIds = Object.keys(cluster.workers);
  var dead = 0;
  workerIds.forEach(function(id) {
    var worker = cluster.workers[id];
    worker.once('exit', function() {
      dead ++;
      if (dead == workerIds.length && cb) cb();
    });
    
    worker.kill();
  });
}

Master.restart =
function restart(env, cb) {
  debug('restart');
  if (typeof env == 'function') {
    cb = env;
    env = undefined;
  }
  if (! env) env = extend({}, process.env);

  env._FLOCK_CLUSTER_MASTER_ = 'true';

  var options = {
    env: env,
    detached: true
  };

  var newMaster = fork(process.argv[1], options);

  newMaster.once('message', function(m) {
    debug('message from new master: %j', m)
    assert.equal(m, prefix + 'online');
    killAllWorkers(function() {
      debug('killed all workers');
      if (cb) cb(newMaster);
    });
  });

  newMaster.unref();

  return newMaster;
};


/// Send Internal Message

var prefix = '_FLOCK_CLUSTER_'

function sendInternalMessage(m) {
  m = prefix + m;
  debug('sending internal message to original master %j', m)
  process.send(m);
}


/// Master <=> Master

if (process.env._FLOCK_CLUSTER_MASTER_)
  sendInternalMessage('online');
