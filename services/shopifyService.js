const Shopify = require('shopify-api-node');

// Initialize Shopify client
const shopify = new Shopify({
  shopName: process.env.SHOPIFY_STORE_NAME,
  apiKey: process.env.SHOPIFY_API_KEY,
  password: process.env.SHOPIFY_PASSWORD
});

/**
 * Search Shopify store for product using Storefront API
 * @param {string} productQuery - Search query for the product
 * @param {string} targetStore - Target store (for multi-store support)
 * @returns {Object} Product information including variant ID and price
 */
async function searchProduct(productQuery, targetStore = null) {
  try {
    // For now, use Admin API to search products
    // In production, you'd use Storefront API for better performance
    const products = await shopify.product.list({
      limit: 10,
      handle: productQuery.toLowerCase().replace(/\s+/g, '-')
    });

    if (products.length === 0) {
      // Try title search if handle search fails
      const allProducts = await shopify.product.list({ limit: 50 });
      const matched = allProducts.filter(p => 
        p.title.toLowerCase().includes(productQuery.toLowerCase())
      );

      if (matched.length === 0) {
        throw new Error(`Product not found: ${productQuery}`);
      }

      return {
        productId: matched[0].id,
        title: matched[0].title,
        variantId: matched[0].variants[0].id,
        price: matched[0].variants[0].price,
        available: matched[0].variants[0].available
      };
    }

    return {
      productId: products[0].id,
      title: products[0].title,
      variantId: products[0].variants[0].id,
      price: products[0].variants[0].price,
      available: products[0].variants[0].available
    };

  } catch (error) {
    console.error('Product search error:', error);
    throw new Error('Failed to search for product');
  }
}

/**
 * Create order with authorize-only payment
 * @param {Object} orderData - Order details
 * @returns {Object} Created order with escrow ID
 */
async function createOrder(orderData) {
  try {
    const { productInfo, maxAmount, releaseCondition } = orderData;

    // Create draft order with authorize-only payment
    const draftOrder = await shopify.draftOrder.create({
      line_items: [{
        variant_id: productInfo.variantId,
        quantity: 1
      }],
      payment_gateway_names: ['manual'], // For authorize-only
      payment_terms: {
        amount_in_cents: {
          amount: parseFloat(productInfo.price) * 100,
          currency: 'USD'
        },
        due_in_days: 0
      },
      note: `Escrow order - Release condition: ${releaseCondition}`,
      tags: 'escrow,pending-release'
    });

    // Generate unique escrow ID
    const escrowId = `escrow_${Date.now()}_${draftOrder.id}`;

    // In a real implementation, you'd:
    // 1. Store this in your database with escrowId
    // 2. Process payment through Shopify's payment processing
    // 3. Set up authorize-only transaction

    return {
      escrowId,
      draftOrderId: draftOrder.id,
      productInfo,
      maxAmount,
      releaseCondition,
      status: 'pending_payment',
      createdAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Order creation error:', error);
    throw new Error('Failed to create order');
  }
}

/**
 * Capture authorized payment on delivery confirmation
 * @param {string} escrowId - Escrow transaction ID
 * @returns {Object} Capture transaction details
 */
async function capturePayment(escrowId) {
  try {
    // In real implementation, you'd:
    // 1. Look up the order by escrowId from your database
    // 2. Use Shopify Admin API to capture the authorized payment
    // 3. Update order status to 'captured'

    // For demo, we'll simulate the capture
    return {
      escrowId,
      status: 'captured',
      capturedAt: new Date().toISOString(),
      amount: 0, // Would be actual amount in production
      currency: 'USD'
    };

  } catch (error) {
    console.error('Payment capture error:', error);
    throw new Error('Failed to capture payment');
  }
}

/**
 * Void authorized payment
 * @param {string} escrowId - Escrow transaction ID
 * @returns {Object} Void transaction details
 */
async function voidPayment(escrowId) {
  try {
    // In real implementation, you'd:
    // 1. Look up the order by escrowId from your database
    // 2. Use Shopify Admin API to void the authorization
    // 3. Update order status to 'voided'

    // For demo, we'll simulate the void
    return {
      escrowId,
      status: 'voided',
      voidedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Payment void error:', error);
    throw new Error('Failed to void payment');
  }
}

module.exports = {
  searchProduct,
  createOrder,
  capturePayment,
  voidPayment
};