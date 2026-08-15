const express = require('express');
const router = express.Router();
const intentParser = require('../services/intentParser');
const shopifyService = require('../services/shopifyService');
const rainService = require('../services/rainService');
const dealStore = require('../services/dealStore');

/**
 * POST /intent
 * Parse buyer's sentence and create a Deal
 * Body: { buyerMessage: string }
 * Returns: Deal object { dealId, storeName, merchantId, productTitle, amount, status }
 */
router.post('/intent', async (req, res) => {
  try {
    const { buyerMessage } = req.body;
    
    if (!buyerMessage) {
      return res.status(400).json({ error: 'buyerMessage is required' });
    }

    console.log(`Processing intent for message: "${buyerMessage}"`);

    // Step 1: Parse buyer intent using LLM
    const intent = await intentParser.parse(buyerMessage);
    console.log('Parsed intent:', intent);

    // Step 2: Search Shopify store for product
    const productInfo = await shopifyService.searchProduct(
      intent.productQuery, 
      intent.targetStore
    );
    console.log('Found product:', productInfo.title);

    // Step 3: Generate merchant ID (in production, this would come from store config)
    const merchantId = intent.targetStore || process.env.SHOPIFY_STORE_NAME || 'default_merchant';

    // Step 4: Determine amount (use product price or maxAmount if specified)
    const amount = intent.maxAmount || parseFloat(productInfo.price);

    // Step 5: Create Deal object
    const deal = dealStore.createDeal({
      storeName: intent.targetStore || process.env.SHOPIFY_STORE_NAME || 'Unknown Store',
      merchantId: merchantId,
      productTitle: productInfo.title,
      amount: amount,
      productInfo: productInfo,
      parsedIntent: intent,
      releaseCondition: intent.releaseCondition
    });

    // Return Deal object as per contract
    res.json({
      dealId: deal.dealId,
      storeName: deal.storeName,
      merchantId: deal.merchantId,
      productTitle: deal.productTitle,
      amount: deal.amount,
      status: deal.status
    });

  } catch (error) {
    console.error('Intent processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /checkout
 * Process checkout with Rain card credentials
 * Body: { dealId: string, cardCredentials: object }
 * Returns: Deal object in HELD status
 */
router.post('/checkout', async (req, res) => {
  try {
    const { dealId, cardCredentials } = req.body;
    
    if (!dealId) {
      return res.status(400).json({ error: 'dealId is required' });
    }

    if (!cardCredentials) {
      return res.status(400).json({ error: 'cardCredentials are required' });
    }

    console.log(`Processing checkout for deal: ${dealId}`);

    // Step 1: Retrieve the deal
    const deal = dealStore.getDeal(dealId);
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    if (deal.status !== dealStore.DealStatus.CREATED) {
      return res.status(400).json({ error: `Deal is in ${deal.status} state, cannot checkout` });
    }

    // Step 2: Create Shopify order with authorize-only payment using card credentials
    const orderResult = await shopifyService.createOrder({
      productInfo: deal.productInfo,
      maxAmount: deal.amount,
      releaseCondition: deal.releaseCondition,
      cardCredentials: cardCredentials
    });

    console.log('Shopify order created:', orderResult.draftOrderId);

    // Step 3: Update deal to HELD status
    const updatedDeal = dealStore.updateDealStatus(dealId, dealStore.DealStatus.HELD, {
      shopifyDraftOrderId: orderResult.draftOrderId,
      shopifyOrderId: orderResult.orderId,
      cardCredentials: cardCredentials,
      checkoutProcessedAt: new Date().toISOString()
    });

    // Return Deal object in HELD status as per contract
    res.json({
      dealId: updatedDeal.dealId,
      storeName: updatedDeal.storeName,
      merchantId: updatedDeal.merchantId,
      productTitle: updatedDeal.productTitle,
      amount: updatedDeal.amount,
      status: updatedDeal.status
    });

  } catch (error) {
    console.error('Checkout processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /confirm-delivery
 * Confirm delivery and capture payment
 * Body: { dealId: string }
 * Returns: Deal object in RELEASED status
 */
router.post('/confirm-delivery', async (req, res) => {
  try {
    const { dealId } = req.body;
    
    if (!dealId) {
      return res.status(400).json({ error: 'dealId is required' });
    }

    console.log(`Confirming delivery for deal: ${dealId}`);

    // Step 1: Retrieve the deal
    const deal = dealStore.getDeal(dealId);
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    if (deal.status !== dealStore.DealStatus.HELD) {
      return res.status(400).json({ error: `Deal is in ${deal.status} state, cannot confirm delivery` });
    }

    // Step 2: Capture the authorized payment through Shopify
    const captureResult = await shopifyService.capturePayment(deal.shopifyDraftOrderId);
    console.log('Payment captured:', captureResult.status);

    // Step 3: Update deal to RELEASED status
    const updatedDeal = dealStore.updateDealStatus(dealId, dealStore.DealStatus.RELEASED, {
      captureDetails: captureResult,
      releasedAt: new Date().toISOString()
    });

    // Return Deal object in RELEASED status as per contract
    res.json({
      dealId: updatedDeal.dealId,
      storeName: updatedDeal.storeName,
      merchantId: updatedDeal.merchantId,
      productTitle: updatedDeal.productTitle,
      amount: updatedDeal.amount,
      status: updatedDeal.status
    });

  } catch (error) {
    console.error('Delivery confirmation error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /deals/:dealId
 * Get deal details (helper endpoint for debugging)
 */
router.get('/deals/:dealId', (req, res) => {
  try {
    const { dealId } = req.params;
    const deal = dealStore.getDeal(dealId);
    
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    res.json(deal);
  } catch (error) {
    console.error('Get deal error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /deals
 * Get all deals (helper endpoint for debugging)
 */
router.get('/deals', (req, res) => {
  try {
    const allDeals = dealStore.getAllDeals();
    res.json(allDeals);
  } catch (error) {
    console.error('Get all deals error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /mint-card
 * Helper endpoint to mint a Rain card for testing
 * Body: { merchantId: string, amount: number }
 * Returns: Card credentials
 */
router.post('/mint-card', async (req, res) => {
  try {
    const { merchantId, amount } = req.body;
    
    if (!merchantId || !amount) {
      return res.status(400).json({ error: 'merchantId and amount are required' });
    }

    console.log(`Minting card for merchant ${merchantId} with amount ${amount}`);

    const cardCredentials = await rainService.mintScopedCard(merchantId, amount);

    res.json({
      success: true,
      cardCredentials: cardCredentials
    });

  } catch (error) {
    console.error('Card minting error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
