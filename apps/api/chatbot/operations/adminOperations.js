/**
 * Modular Admin Operations Module
 * Contains database handlers for administrative catalog, suppliers, and order analytics.
 */

const {
  createProductInDb,
  updateProductInDb,
  bulkUpdateProductsInDb,
  searchProductsInDb,
  getCategoryProductsFromDb,
  getLowStockProductsFromDb,
  deleteProductFromDb,
  createSupplierInDb,
  updateSupplierInDb,
  deleteSupplierFromDb,
  searchSuppliersInDb,
  filterSuppliersByLocationInDb,
  listOrdersFromDb,
  getOrderByIdFromDb,
  getOrdersByStatusFromDb,
  getOrdersByCustomerFromDb,
  getOrdersByDateRangeFromDb,
  getOrdersByAmountFilterFromDb,
  updateOrderStatusInDb,
  bulkApproveOrdersInDb,
  getOrderAnalyticsFromDb,
  getTopBuyersFromDb,
  getMostOrderedProductsFromDb,
  getOverdueOrdersFromDb,
  getOrdersByProductFromDb
} = require('../../adminOperations');

module.exports = {
  createProductInDb,
  updateProductInDb,
  bulkUpdateProductsInDb,
  searchProductsInDb,
  getCategoryProductsFromDb,
  getLowStockProductsFromDb,
  deleteProductFromDb,
  createSupplierInDb,
  updateSupplierInDb,
  deleteSupplierFromDb,
  searchSuppliersInDb,
  filterSuppliersByLocationInDb,
  listOrdersFromDb,
  getOrderByIdFromDb,
  getOrdersByStatusFromDb,
  getOrdersByCustomerFromDb,
  getOrdersByDateRangeFromDb,
  getOrdersByAmountFilterFromDb,
  updateOrderStatusInDb,
  bulkApproveOrdersInDb,
  getOrderAnalyticsFromDb,
  getTopBuyersFromDb,
  getMostOrderedProductsFromDb,
  getOverdueOrdersFromDb,
  getOrdersByProductFromDb
};
