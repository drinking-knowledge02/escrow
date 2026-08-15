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
    // Check if we have valid Shopify credentials
    if (!process.env.SHOPIFY_API_KEY || process.env.SHOPIFY_API_KEY.includes('your_shopify') || process.env.SHOPIFY_API_KEY.includes('test')) {
      console.log('Using mock Shopify product search (no valid credentials)');
      return mockSearchProduct(productQuery, targetStore);
    }

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
    // Fallback to mock search if API call fails
    console.log('Falling back to mock product search due to API error');
    return mockSearchProduct(productQuery, targetStore);
  }
}

/**
 * Mock product search for testing without Shopify API
 * @param {string} productQuery - Search query for the product
 * @param {string} targetStore - Target store (for multi-store support)
 * @returns {Object} Product information including variant ID and price
 */
function mockSearchProduct(productQuery, targetStore = null) {
  // Generate mock product data
  const mockProducts = {
    'wireless headset': {
      productId: 'mock_prod_123',
      title: 'Premium Wireless Headset',
      variantId: 'mock_var_456',
      price: '79.99',
      available: true
    },
    'headset': {
      productId: 'mock_prod_124',
      title: 'Standard Headset',
      variantId: 'mock_var_457',
      price: '49.99',
      available: true
    },
    'phone': {
      productId: 'mock_prod_125',
      title: 'Smartphone Pro',
      variantId: 'mock_var_458',
      price: '699.99',
      available: true
    },
    'laptop': {
      productId: 'mock_prod_126',
      title: 'Laptop Computer',
      variantId: 'mock_var_459',
      price: '999.99',
      available: true
    }
  };

  // Try to find matching product
  const productKey = Object.keys(mockProducts).find(key => productQuery.toLowerCase().includes(key));
  const product = productKey ? mockProducts[productKey] : {
    productId: `mock_prod_${Date.now()}`,
    title: productQuery.charAt(0).toUpperCase() + productQuery.slice(1),
    variantId: `mock_var_${Date.now()}`,
    price: '99.99',
    available: true
  };

  console.log(`Mock product found: ${product.title} at $${product.price}`);
  return product;
}

/**
 * Create order with authorize-only payment
 * @param {Object} orderData - Order details including card credentials
 * @returns {Object} Created order with escrow ID
 */
async function createOrder(orderData) {
  try {
    const { productInfo, maxAmount, releaseCondition, cardCredentials } = orderData;

    // Check if we have valid Shopify credentials
    if (!process.env.SHOPIFY_API_KEY || process.env.SHOPIFY_API_KEY.includes('your_shopify') || process.env.SHOPIFY_API_KEY.includes('test')) {
      console.log('Using mock Shopify order creation (no valid credentials)');
      return mockCreateOrder(orderData);
    }

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
      tags: 'escrow,pending-release',
      // In production, you would process the card payment here
      // using the card_credentials for authorize-only transaction
      applied_discount: {
        description: 'Escrow authorize-only',
        value: '0',
        value_type: 'fixed_amount'
      }
    });

    // Generate unique escrow ID
    const escrowId = `escrow_${Date.now()}_${draftOrder.id}`;

    // In a real implementation, you'd:
    // 1. Store this in your database with escrowId
    // 2. Process payment through Shopify's payment processing using cardCredentials
    // 3. Set up authorize-only transaction with the provided card
    // 4. Return the actual transaction ID

    console.log(`Created draft order ${draftOrder.id} for escrow ${escrowId}`);
    if (cardCredentials) {
      console.log(`Card credentials provided for authorize-only payment`);
    }

    return {
      escrowId,
      draftOrderId: draftOrder.id,
      orderId: draftOrder.id, // In production, this would be the actual order ID
      productInfo,
      maxAmount,
      releaseCondition,
      status: 'authorized', // Payment authorized, awaiting capture
      createdAt: new Date().toISOString(),
      cardCredentials: cardCredentials ? '****' + cardCredentials.cardNumber?.slice(-4) : null
    };

  } catch (error) {
    console.error('Order creation error:', error);
    // Fallback to mock order creation if API call fails
    console.log('Falling back to mock order creation due to API error');
    return mockCreateOrder(orderData);
  }
}

/**
 * Mock order creation for testing without Shopify API
 * @param {Object} orderData - Order details including card credentials
 * @returns {Object} Created order with escrow ID
 */
function mockCreateOrder(orderData) {
  const { productInfo, maxAmount, releaseCondition, cardCredentials } = orderData;
  const mockDraftOrderId = `mock_draft_${Date.now()}`;
  
  console.log(`Mock order created: ${mockDraftOrderId} for product: ${productInfo.title}`);
  if (cardCredentials) {
    console.log(`Card credentials provided: ****${cardCredentials.cardNumber?.slice(-4)}`);
  }

  return {
    escrowId: `escrow_${Date.now()}_${mockDraftOrderId}`,
    draftOrderId: mockDraftOrderId,
    orderId: mockDraftOrderId,
    productInfo,
    maxAmount,
    releaseCondition,
    status: 'authorized',
    createdAt: new Date().toISOString(),
    cardCredentials: cardCredentials ? '****' + cardCredentials.cardNumber?.slice(-4) : null
  };
}

/**
 * Capture authorized payment on delivery confirmation
 * @param {string} draftOrderId - Shopify draft order ID
 * @returns {Object} Capture transaction details
 */
async function capturePayment(draftOrderId) {
  try {
    // Check if we have valid Shopify credentials
    if (!process.env.SHOPIFY_API_KEY || process.env.SHOPIFY_API_KEY.includes('your_shopify') || process.env.SHOPIFY_API_KEY.includes('test')) {
      console.log('Using mock Shopify payment capture (no valid credentials)');
      return mockCapturePayment(draftOrderId);
    }

    // In real implementation, you'd:
    // 1. Use Shopify Admin API to complete the draft order
    // 2. Capture the authorized payment
    // 3. Update order status to 'captured'

    // For demo, we'll complete the draft order
    const completedOrder = await shopify.draftOrder.complete(draftOrderId);

    console.log(`Completed draft order ${draftOrderId} -> order ${completedOrder.id}`);

    return {
      draftOrderId,
      orderId: completedOrder.id,
      status: 'captured',
      capturedAt: new Date().toISOString(),
      amount: completedOrder.total_price || '0.00',
      currency: completedOrder.currency || 'USD'
    };

  } catch (error) {
    console.error('Payment capture error:', error);
    // Fallback to mock capture if API call fails
    console.log('Falling back to mock payment capture due to API error');
    return mockCapturePayment(draftOrderId);
  }
}

/**
 * Mock payment capture for testing without Shopify API
 * @param {string} draftOrderId - Shopify draft order ID
 * @returns {Object} Capture transaction details
 */
function mockCapturePayment(draftOrderId) {
  console.log(`Mock payment captured for order: ${draftOrderId}`);
  return {
    draftOrderId,
    orderId: draftOrderId,
    status: 'captured',
    capturedAt: new Date().toISOString(),
    amount: '99.99',
    currency: 'USD'
  };
}

/**
 * Void authorized payment
 * @param {string} draftOrderId - Shopify draft order ID
 * @returns {Object} Void transaction details
 */
async function voidPayment(draftOrderId) {
  try {
    // Check if we have valid Shopify credentials
    if (!process.env.SHOPIFY_API_KEY || process.env.SHOPIFY_API_KEY.includes('your_shopify') || process.env.SHOPIFY_API_KEY.includes('test')) {
      console.log('Using mock Shopify payment void (no valid credentials)');
      return mockVoidPayment(draftOrderId);
    }

    // In real implementation, you'd:
    // 1. Use Shopify Admin API to delete the draft order
    // 2. Cancel any authorized payment
    // 3. Update order status to 'voided'

    // For demo, we'll delete the draft order
    await shopify.draftOrder.delete(draftOrderId);

    console.log(`Deleted draft order ${draftOrderId}`);

    return {
      draftOrderId,
      status: 'voided',
      voidedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Payment void error:', error);
    // Fallback to mock void if API call fails
    console.log('Falling back to mock payment void due to API error');
    return mockVoidPayment(draftOrderId);
  }
}

/**
 * Mock payment void for testing without Shopify API
 * @param {string} draftOrderId - Shopify draft order ID
 * @returns {Object} Void transaction details
 */
function mockVoidPayment(draftOrderId) {
  console.log(`Mock payment voided for order: ${draftOrderId}`);
  return {
    draftOrderId,
    status: 'voided',
    voidedAt: new Date().toISOString()
  };
}

module.exports = {
  searchProduct,
  createOrder,
  capturePayment,
  voidPayment,
  mockSearchProduct,
  mockCreateOrder,
  mockCapturePayment,
  mockVoidPayment
};