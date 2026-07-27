/**
 * Modular Distributor Operations Module
 * Contains database handlers for wholesale distributor pricing, quotations, orders, ledger, and prompt-based actions.
 */

const {
  getDistributorWholesaleProductsFromDb,
  getDistributorQuotationsFromDb,
  getDistributorQuotationsByStatusFromDb,
  getDistributorQuotationByIdFromDb,
  getDistributorQuotationsByAmountFromDb,
  updateDistributorQuotationStatusInDb,
  getDistributorQuotationKpisFromDb,
  getDistributorQuotationsByProductFromDb,
  getExpiringDistributorQuotationsFromDb,
  getDistributorOrdersFromDb,
  getDistributorLedgerStatusFromDb,
  createDistributorQuotationInDb,
  createDistributorDirectOrderInDb
} = require('../../distributorOperations');

module.exports = {
  getDistributorWholesaleProductsFromDb,
  getDistributorQuotationsFromDb,
  getDistributorQuotationsByStatusFromDb,
  getDistributorQuotationByIdFromDb,
  getDistributorQuotationsByAmountFromDb,
  updateDistributorQuotationStatusInDb,
  getDistributorQuotationKpisFromDb,
  getDistributorQuotationsByProductFromDb,
  getExpiringDistributorQuotationsFromDb,
  getDistributorOrdersFromDb,
  getDistributorLedgerStatusFromDb,
  createDistributorQuotationInDb,
  createDistributorDirectOrderInDb
};
