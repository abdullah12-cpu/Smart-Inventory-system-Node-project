/**
 * Modular Distributor Operations Module
 * Contains database handlers for wholesale distributor pricing, quotations, orders, ledger, and prompt-based actions.
 */

const {
  getDistributorWholesaleProductsFromDb,
  getDistributorQuotationsFromDb,
  getDistributorOrdersFromDb,
  getDistributorLedgerStatusFromDb,
  createDistributorQuotationInDb,
  createDistributorDirectOrderInDb
} = require('../../distributorOperations');

module.exports = {
  getDistributorWholesaleProductsFromDb,
  getDistributorQuotationsFromDb,
  getDistributorOrdersFromDb,
  getDistributorLedgerStatusFromDb,
  createDistributorQuotationInDb,
  createDistributorDirectOrderInDb
};
