const debug = require('debug');

module.exports = (namespace = 'app') => debug(`sonosbot:${namespace}`);
