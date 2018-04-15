const chai = require('chai');
const dirtyChai = require('dirty-chai');
const spies = require('chai-spies');

chai.use(dirtyChai);
chai.use(spies);

module.exports = { chai };

