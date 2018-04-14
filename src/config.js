const fs = require('fs');

const requireJson = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const configFile = process.env.NODE_ENV !== 'test' ? 'config.json' : 'config.json.example';

const config = requireJson(`${__dirname}/../config/${configFile}`);

module.exports = config;
