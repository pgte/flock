var cluster = require('cluster');

module.exports = require(cluster.isMaster ? './master' : './worker');