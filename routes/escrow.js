const express = require('express');
const router = express.Router();
const intentParser = require('../services/intentParser');
const shopifyService = require('../services/shopifyService');

// POST /api/escrow/create - Initialize escrow with parsed intent
router.post('/create', async (req, res) => {
  try {
    const { buyerMessage } = req.body;
    
    if (!buyerMessage) {
      return res.status(400).json({ error: 'buyerMessage is required' });
    }

    // Parse buyer intent
    const intent = await intentParser.parse(buyerMessage);
    
    // Search Shopify store for product
    const productInfo = await shopifyService.searchProduct(intent.productQuery, intent.targetStore);
    
    // Create order with authorize-only payment
    const order = await shopifyService.createOrder({
      productInfo,
      maxAmount: intent.maxAmount,
      releaseCondition: intent.releaseCondition
    });

    res.json({
      success: true,
      escrowId: order.escrowId,
      orderDetails: order,
      parsedIntent: intent
    });

  } catch (error) {
    console.error('Create escrow error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/escrow/release - Capture payment on delivery confirmation
router.post('/release', async (req, res) => {
  try {
    const { escrowId } = req.body;
    
    if (!escrowId) {
      return res.status(400).json({ error: 'escrowId is required' });
    }

    // Capture the authorized payment
    const result = await shopifyService.capturePayment(escrowId);

    res.json({
      success: true,
      message: 'Payment captured successfully',
      transactionDetails: result
    });

  } catch (error) {
    console.error('Release payment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/escrow/cancel - Void/expire authorization
router.post('/cancel', async (req, res) => {
  try {
    const { escrowId } = req.body;
    
    if (!escrowId) {
      return res.status(400).json({ error: 'escrowId is required' });
    }

    // Void the authorized payment
    const result = await shopifyService.voidPayment(escrowId);

    res.json({
      success: true,
      message: 'Payment voided successfully',
      transactionDetails: result
    });

  } catch (error) {
    console.error('Cancel escrow error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/escrow/delivery-confirm - Simulate delivery webhook for demo
router.post('/delivery-confirm', async (req, res) => {
  try {
    const { escrowId } = req.body;
    
    if (!escrowId) {
      return res.status(400).json({ error: 'escrowId is required' });
    }

    // This would normally be triggered by a real tracking webhook
    // For demo, we'll manually trigger the release
    const result = await shopifyService.capturePayment(escrowId);

    res.json({
      success: true,
      message: 'Delivery confirmed - payment released',
      transactionDetails: result
    });

  } catch (error) {
    console.error('Delivery confirmation error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;