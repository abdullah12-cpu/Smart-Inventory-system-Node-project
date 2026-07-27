const adminOps = require('./adminOperations');
const distributorOps = require('./distributorOperations');

module.exports = {
  ...adminOps,
  ...distributorOps
};
