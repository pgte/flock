var EventEmitter = require('events').EventEmitter;
var cluster = require('cluster');
var fork = require('child_process').fork;
var propagate = require('propagate');
var extend = require('util')._extend;
var assert = require('assert');
var net = require('net');
var extend = require('util')._extend;

var messages = require('../messages');
var servers = require('./servers');
var Worker = require('./worker');
var debug = require('../debug')('master ' + process.pid);

debug('new master');

var Master =
exports =
module.exports =
new EventEmitter();

propagate(cluster, Master);

Master.isMaster = true;
Master.isWorker = false;


/// Setup Master

var settings = {
  timeout: 5000 // default timeout
};

Master.setupMaster =
function setupMaster(_settings) {
  settings = extend(_settings, settings);
  cluster.setupMaster.apply(cluster, arguments);
};


/// Fork

var serverHandlers = {};

function workerInit(worker) {
  messages.wait(worker, 'queryServer', 0, function(m) {

    var handler = servers.getServer(m.address, m.port, m.addressType, m.fd);

    var message = {
      cmd: 'serverHandle',
      address:     m.address,
      port:        m.port,
      addressType: m.addressType,
      fd:          m.fd
    };

    messages.send(worker, message, handler);

    messages.wait(worker, 'listening', settings.timeout, function(m) {
      debug('worker %d is listening', worker.id);
      worker.emit('listening', message);
    }, function() {
      console.error('[master' + process.pid + '] timeout expecting the worker ' + worker.id + ' to listen');
    });

  });
}

Master.fork =
function fork() {
  debug('fork with arguments %j', arguments);
  var worker = cluster.fork.apply(cluster, arguments);
  workerInit(worker);
  return Worker.wrap(worker);
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

  messages.wait(newMaster, 'online', settings.timeout, function(m, handle) {
    killAllWorkers(function() {
      debug('killed all workers');
      if (cb) cb(newMaster);
    });
  }, function() {
    /// timeout
    killAllWorkers(function() {
      debug('killed all workers');
      if (cb) cb(newMaster);
    });
  });

  newMaster.unref();

  return newMaster;
};


/// Master <=> Master
if (process.env._FLOCK_CLUSTER_MASTER_)
  messages.sendInternal('online');