/**
 * Deal Store - Manages Deal state for escrow transactions
 * In-memory implementation for demo purposes (can be replaced with database)
 */

// In-memory store for deals
const deals = new Map();

/**
 * Deal status enum
 */
const DealStatus = {
  CREATED: 'CREATED',       // Initial state after intent parsing
  HELD: 'HELD',             // Payment authorized, awaiting delivery
  RELEASED: 'RELEASED',     // Payment captured, deal complete
  CANCELLED: 'CANCELLED',   // Deal cancelled, payment voided
  EXPIRED: 'EXPIRED'        // Authorization expired
};

/**
 * Create a new deal
 * @param {Object} dealData - Deal information
 * @returns {Object} Created deal with ID
 */
function createDeal(dealData) {
  const dealId = `deal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const deal = {
    dealId,
    status: DealStatus.CREATED,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...dealData
  };
  
  deals.set(dealId, deal);
  console.log(`Created deal: ${dealId} with status ${deal.status}`);
  
  return deal;
}

/**
 * Get deal by ID
 * @param {string} dealId - Deal identifier
 * @returns {Object|null} Deal object or null if not found
 */
function getDeal(dealId) {
  return deals.get(dealId) || null;
}

/**
 * Update deal status
 * @param {string} dealId - Deal identifier
 * @param {string} newStatus - New status from DealStatus enum
 * @param {Object} additionalData - Additional data to update
 * @returns {Object} Updated deal
 */
function updateDealStatus(dealId, newStatus, additionalData = {}) {
  const deal = deals.get(dealId);
  
  if (!deal) {
    throw new Error(`Deal not found: ${dealId}`);
  }
  
  deal.status = newStatus;
  deal.updatedAt = new Date().toISOString();
  Object.assign(deal, additionalData);
  
  deals.set(dealId, deal);
  console.log(`Updated deal ${dealId} to status ${newStatus}`);
  
  return deal;
}

/**
 * Add card credentials to deal
 * @param {string} dealId - Deal identifier
 * @param {Object} cardCredentials - Card credentials from Rain
 * @returns {Object} Updated deal
 */
function addCardCredentials(dealId, cardCredentials) {
  const deal = deals.get(dealId);
  
  if (!deal) {
    throw new Error(`Deal not found: ${dealId}`);
  }
  
  deal.cardCredentials = cardCredentials;
  deal.updatedAt = new Date().toISOString();
  
  deals.set(dealId, deal);
  console.log(`Added card credentials to deal ${dealId}`);
  
  return deal;
}

/**
 * Get all deals (for debugging/demo)
 * @returns {Array} Array of all deals
 */
function getAllDeals() {
  return Array.from(deals.values());
}

/**
 * Delete deal (for cleanup)
 * @param {string} dealId - Deal identifier
 * @returns {boolean} True if deleted, false if not found
 */
function deleteDeal(dealId) {
  const result = deals.delete(dealId);
  if (result) {
    console.log(`Deleted deal: ${dealId}`);
  }
  return result;
}

module.exports = {
  createDeal,
  getDeal,
  updateDealStatus,
  addCardCredentials,
  getAllDeals,
  deleteDeal,
  DealStatus
};
