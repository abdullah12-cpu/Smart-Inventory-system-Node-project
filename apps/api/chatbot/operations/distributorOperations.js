/**
 * Modular Distributor Operations Module
 * Contains database handlers for wholesale distributor pricing, quotations, orders, and ledger.
 */

const {
  getDistributorWholesaleProductsFromDb,
  getDistributorQuotationsFromDb,
  getDistributorOrdersFromDb,
  getDistributorLedgerStatusFromDb
} = require('../../distributorOperations');

module.exports = {
  getDistributorWholesaleProductsFromDb,
  getDistributorQuotationsFromDb,
  getDistributorOrdersFromDb,
  getDistributorLedgerStatusFromDb
};
