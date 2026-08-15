/**
 * Rain Service for minting scoped payment cards
 * This service handles the integration with Rain API for creating merchant-specific cards
 */

/**
 * Mint a scoped card for a specific merchant and amount
 * @param {string} merchantId - The merchant/store identifier
 * @param {number} amount - The amount to load on the card
 * @returns {Object} Card credentials including card number, expiry, CVC
 */
async function mintScopedCard(merchantId, amount) {
  try {
    // In production, this would call the Rain API
    // For demo purposes, we'll simulate the card minting
    
    const rainApiKey = process.env.RAIN_API_KEY;
    if (!rainApiKey) {
      throw new Error('RAIN_API_KEY not configured');
    }

    // Simulate API call to Rain
    // const response = await fetch('https://api.rain.com/v1/cards', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${rainApiKey}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     merchant_id: merchantId,
    //     amount: amount,
    //     currency: 'USD',
    //     scope: 'single_use'
    //   })
    // });

    // Simulated response for demo
    const simulatedCard = {
      cardId: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      cardNumber: '4242' + Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0'),
      expiryMonth: String(Math.floor(Math.random() * 12) + 1).padStart(2, '0'),
      expiryYear: String(new Date().getFullYear() + Math.floor(Math.random() * 3) + 1),
      cvc: Math.floor(Math.random() * 900 + 100).toString(),
      amount: amount,
      currency: 'USD',
      merchantId: merchantId,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    console.log(`Minted scoped card for merchant ${merchantId}: ${simulatedCard.cardId}`);
    
    return simulatedCard;

  } catch (error) {
    console.error('Rain card minting error:', error);
    throw new Error('Failed to mint scoped card from Rain');
  }
}

/**
 * Get card details/status
 * @param {string} cardId - The card identifier
 * @returns {Object} Card details
 */
async function getCardDetails(cardId) {
  try {
    // In production, this would call Rain API to get card status
    // For demo, return simulated data
    return {
      cardId,
      status: 'active',
      remainingBalance: 0, // Would be actual balance in production
      transactions: []
    };
  } catch (error) {
    console.error('Get card details error:', error);
    throw new Error('Failed to get card details');
  }
}

/**
 * Cancel/card a scoped card
 * @param {string} cardId - The card identifier
 * @returns {Object} Cancellation confirmation
 */
async function cancelCard(cardId) {
  try {
    // In production, this would call Rain API to cancel the card
    console.log(`Cancelled card: ${cardId}`);
    
    return {
      cardId,
      status: 'cancelled',
      cancelledAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Cancel card error:', error);
    throw new Error('Failed to cancel card');
  }
}

module.exports = {
  mintScopedCard,
  getCardDetails,
  cancelCard
};
