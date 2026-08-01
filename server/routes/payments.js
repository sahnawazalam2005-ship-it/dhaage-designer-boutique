/**
 * Payment routes — Razorpay order creation, signature verification, and webhooks.
 *
 * SECURITY MODEL:
 * - The order amount is NEVER taken from the browser. It is recomputed here from the
 *   SQLite products table using the product_id + qty stored in the order at creation time.
 * - RAZORPAY_KEY_SECRET stays on the server only. The browser only ever receives RAZORPAY_KEY_ID.
 * - Payment is marked "paid" ONLY after HMAC SHA-256 signature verification succeeds.
 * - The webhook is signature-verified and processed idempotently.
 */
const express = require('express');
const crypto = require('crypto');
const { db } = require('../db');
const {
  RAZORPAY_KEY_ID,
  isRazorpayConfigured,
  createRazorpayOrder,
  verifyPaymentSignature,
  verifyWebhookSignature
} = require('../razorpay');

const router = express.Router();

/** Log a payment attempt for audit / idempotency. */
function logAttempt({ order_id, razorpay_order_id, razorpay_payment_id, status, error_message, raw_response }) {
  db.prepare(`
    INSERT INTO payment_attempts (order_id, razorpay_order_id, razorpay_payment_id, status, error_message, raw_response)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    order_id || null,
    razorpay_order_id || null,
    razorpay_payment_id || null,
    status || 'unknown',
    error_message || null,
    raw_response ? JSON.stringify(raw_response).slice(0, 2000) : null
  );
}

/**
 * Recompute the order total from the SQLite products table using the validated
 * items stored on the order. Returns { subtotal, shipping, total }.
 */
function recomputeOrderAmounts(order) {
  let items = [];
  try { items = JSON.parse(order.items_json || '[]'); } catch { items = []; }

  let subtotal = 0;
  for (const it of items) {
    const product = db.prepare('SELECT id, price, discounted_price FROM products WHERE id = ?').get(it.product_id);
    if (!product) throw new Error(`Product (ID ${it.product_id}) no longer exists.`);
    const unitPrice = product.discounted_price || product.price;
    const qty = Math.max(1, parseInt(it.qty, 10) || 1);
    subtotal += unitPrice * qty;
  }

  const settings = db.prepare('SELECT * FROM settings').all().reduce((acc, row) => { acc[row.key] = row.value; return acc; }, {});
  const shipping = Number(settings.delivery_charge || 0);
  const freeAbove = Number(settings.free_delivery_above || 0);
  const finalShipping = freeAbove && subtotal >= freeAbove ? 0 : shipping;

  return { subtotal, shipping: finalShipping, total: subtotal + finalShipping };
}

/**
 * POST /api/payments/create-order
 * Body: { order_number }
 * Creates a Razorpay order for an existing pending store order.
 * The amount is recomputed from the DB — any mismatch with the stored total
 * (e.g. price changed after the order was placed) blocks the payment.
 */
router.post('/create-order', (req, res) => {
  const { order_number } = req.body || {};

  if (!isRazorpayConfigured()) {
    return res.status(503).json({ success: false, message: 'Online payments are not configured yet. Please contact support.' });
  }
  if (!order_number) {
    return res.status(400).json({ success: false, message: 'Order number is required.' });
  }

  const order = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(String(order_number).trim());
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found.' });
  }
  if (order.payment_method !== 'razorpay') {
    return res.status(400).json({ success: false, message: 'This order is not set up for online payment.' });
  }
  if (order.payment_status === 'paid') {
    // Idempotent: already paid — return existing razorpay reference without recharging.
    return res.json({
      success: true,
      already_paid: true,
      message: 'This order is already paid.',
      key: RAZORPAY_KEY_ID,
      order_id: order.razorpay_order_id,
      amount: order.total,
      order_number: order.order_number
    });
  }

  // Idempotency: if a Razorpay order already exists, return it (prevents duplicate Razorpay orders on double-click/refresh).
  if (order.razorpay_order_id) {
    return res.json({
      success: true,
      key: RAZORPAY_KEY_ID,
      order_id: order.razorpay_order_id,
      amount: order.total,
      order_number: order.order_number
    });
  }

  // Recompute the amount securely from the DB.
  let computed;
  try {
    computed = recomputeOrderAmounts(order);
  } catch (err) {
    logAttempt({ order_id: order.id, status: 'error', error_message: `Recompute failed: ${err.message}` });
    return res.status(409).json({ success: false, message: err.message || 'Could not verify the order amount.' });
  }

  // Guard against price drift between order placement and payment.
  if (Math.abs(computed.total - order.total) > 0.01) {
    logAttempt({
      order_id: order.id,
      status: 'error',
      error_message: `Amount mismatch: stored=${order.total}, recomputed=${computed.total}`
    });
    return res.status(409).json({
      success: false,
      message: 'One or more product prices changed after your order was placed. Please re-place your order.'
    });
  }

  const amountPaise = Math.round(order.total * 100);
  if (amountPaise < 100) {
    return res.status(400).json({ success: false, message: 'Minimum online payment amount is ₹1.00.' });
  }

  // Create the Razorpay order (async).
  createRazorpayOrder(order.total, order.order_number, { order_number: order.order_number })
    .then((rpOrder) => {
      db.prepare('UPDATE orders SET razorpay_order_id = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .run(rpOrder.id, order.id);
      logAttempt({
        order_id: order.id,
        razorpay_order_id: rpOrder.id,
        status: 'order_created',
        raw_response: { amount: rpOrder.amount, currency: rpOrder.currency }
      });
      res.json({
        success: true,
        key: RAZORPAY_KEY_ID,
        order_id: rpOrder.id,
        amount: order.total,
        order_number: order.order_number
      });
    })
    .catch((err) => {
      console.error('Razorpay create-order error:', err && err.message);
      logAttempt({ order_id: order.id, status: 'order_creation_failed', error_message: (err && err.message) || 'Unknown' });
      res.status(502).json({ success: false, message: 'Could not initialise payment. Please try again.' });
    });
});

/**
 * POST /api/payments/verify
 * Body: { order_number, razorpay_order_id, razorpay_payment_id, signature }
 * Verifies the HMAC signature on the server and ONLY then marks the order as paid.
 */
router.post('/verify', (req, res) => {
  const { order_number, razorpay_order_id, razorpay_payment_id, signature } = req.body || {};

  if (!order_number || !razorpay_order_id || !razorpay_payment_id || !signature) {
    return res.status(400).json({ success: false, message: 'Missing payment verification details.' });
  }

  const order = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(String(order_number).trim());
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found.' });
  }

  // Idempotent: if this order is already paid, return success without re-processing.
  if (order.payment_status === 'paid') {
    return res.json({ success: true, message: 'Payment already verified.', order, paid: true });
  }

  // Ensure the razorpay order belongs to this store order.
  if (order.razorpay_order_id && order.razorpay_order_id !== razorpay_order_id) {
    logAttempt({
      order_id: order.id,
      razorpay_order_id,
      razorpay_payment_id,
      status: 'mismatch',
      error_message: 'razorpay_order_id does not match stored value'
    });
    return res.status(400).json({ success: false, message: 'Payment order mismatch. Please contact support.' });
  }

  const valid = verifyPaymentSignature({ order_id: razorpay_order_id, payment_id: razorpay_payment_id, signature });

  if (!valid) {
    logAttempt({
      order_id: order.id,
      razorpay_order_id,
      razorpay_payment_id,
      status: 'signature_invalid',
      error_message: 'HMAC signature verification failed'
    });
    return res.status(400).json({ success: false, message: 'Payment verification failed. Please try again or contact support.' });
  }

  // Signature is valid → mark order as paid.
  db.prepare(`
    UPDATE orders SET payment_status = 'paid', razorpay_payment_id = ?, paid_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).run(razorpay_payment_id, order.id);

  db.prepare('INSERT INTO order_tracking (order_id, status, note) VALUES (?, ?, ?)')
    .run(order.id, 'paid', 'Payment received successfully via Razorpay.');

  logAttempt({
    order_id: order.id,
    razorpay_order_id,
    razorpay_payment_id,
    status: 'paid',
    raw_response: { verified_via: 'hmac' }
  });

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
  res.json({ success: true, message: 'Payment successful!', order: updated, paid: true });
});

/**
 * POST /api/payments/webhook
 * Razorpay webhook — signature verified, idempotent.
 * Handles: payment.captured, payment.failed, payment.pending, order.paid.
 */
router.post('/webhook', (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const rawBody = req.body;

  // Signature verification — reject silently if invalid.
  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error('Razorpay webhook signature verification failed.');
    return res.status(401).json({ success: false, message: 'Invalid webhook signature.' });
  }

  let event;
  try {
    const bodyStr = typeof rawBody === 'string' ? rawBody : Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : JSON.stringify(rawBody);
    event = JSON.parse(bodyStr);
  } catch {
    return res.status(400).json({ success: false, message: 'Invalid webhook payload.' });
  }

  const payload = event && event.payload;
  const entity = payload && (payload.payment || payload.order || {}).entity;
  if (!entity) {
    return res.status(200).json({ success: true, message: 'Ignored webhook event (no entity).' });
  }

  const razorpayOrderId = entity.order_id || entity.id;
  const razorpayPaymentId = entity.id || entity.payment_id || null;
  const eventType = (event.event || '').toLowerCase();

  // Find order by razorpay_order_id (or payment token fallback via entity.receipt).
  let order = null;
  if (razorpayOrderId) {
    order = db.prepare('SELECT * FROM orders WHERE razorpay_order_id = ?').get(razorpayOrderId);
  }
  if (!order && entity.receipt) {
    order = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(entity.receipt);
  }
  if (!order) {
    return res.status(200).json({ success: true, message: 'No matching order for webhook event.' });
  }

  // Idempotent: do not overwrite a successful payment.
  if (order.payment_status === 'paid' && (eventType.includes('captured') || eventType === 'order.paid')) {
    return res.status(200).json({ success: true, message: 'Already processed (idempotent).' });
  }

  try {
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      db.prepare(`
        UPDATE orders SET payment_status = 'paid', razorpay_payment_id = COALESCE(?, razorpay_payment_id),
          paid_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `).run(razorpayPaymentId, order.id);
      db.prepare('INSERT INTO order_tracking (order_id, status, note) VALUES (?, ?, ?)')
        .run(order.id, 'paid', 'Payment confirmed via Razorpay webhook.');
      logAttempt({ order_id: order.id, razorpay_order_id: razorpayOrderId, razorpay_payment_id: razorpayPaymentId, status: 'paid', raw_response: { source: 'webhook', event: event.event } });
    } else if (eventType === 'payment.failed') {
      db.prepare("UPDATE orders SET payment_status = 'failed', updated_at = datetime('now') WHERE id = ? AND payment_status != 'paid'")
        .run(order.id);
      db.prepare('INSERT INTO order_tracking (order_id, status, note) VALUES (?, ?, ?)')
        .run(order.id, 'payment_failed', 'Payment attempt failed. The order has not been charged.');
      logAttempt({ order_id: order.id, razorpay_order_id: razorpayOrderId, razorpay_payment_id: razorpayPaymentId, status: 'failed', raw_response: { source: 'webhook', event: event.event } });
    } else {
      // payment.pending / other events — just log, do not change paid status.
      logAttempt({ order_id: order.id, razorpay_order_id: razorpayOrderId, razorpay_payment_id: razorpayPaymentId, status: event.event || 'ignored', raw_response: { source: 'webhook' } });
    }
  } catch (err) {
    console.error('Webhook processing error:', err.message);
    return res.status(500).json({ success: false, message: 'Webhook processing failed.' });
  }

  res.status(200).json({ success: true, message: 'Webhook processed.' });
});

/**
 * POST /api/payments/failed
 * Called from the browser after a failed/cancelled payment to record the attempt.
 * Body: { order_number, razorpay_order_id, error }
 * Never marks an order as paid.
 */
router.post('/failed', (req, res) => {
  const { order_number, razorpay_order_id, error } = req.body || {};
  if (!order_number) return res.status(400).json({ success: false, message: 'Order number is required.' });

  const order = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(String(order_number).trim());
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

  logAttempt({
    order_id: order.id,
    razorpay_order_id: razorpay_order_id || order.razorpay_order_id,
    status: 'failed',
    error_message: (error && String(error).slice(0, 500)) || 'Payment failed or cancelled by customer'
  });

  // Only mark failed if not already paid.
  db.prepare("UPDATE orders SET payment_status = 'failed', updated_at = datetime('now') WHERE id = ? AND payment_status != 'paid'")
    .run(order.id);
  db.prepare('INSERT INTO order_tracking (order_id, status, note) VALUES (?, ?, ?)')
    .run(order.id, 'payment_failed', 'Payment was cancelled or failed. No amount has been charged.');

  res.json({ success: true, message: 'Payment attempt recorded.' });
});

module.exports = router;

