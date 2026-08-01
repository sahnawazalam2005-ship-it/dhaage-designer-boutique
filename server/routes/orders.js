/**
 * Order routes - create orders (Razorpay only), track, customer order history, admin management.
 */
const express = require('express');
const { db } = require('../db');
const { auth, adminOnly } = require('../middleware/auth');
const { generateOrderNumber } = require('../utils/helpers');

const router = express.Router();

const PHONE_RE = /^[6-9]\d{9}$/;

/**
 * Delivery status values (manually set by admin).
 * Kept separate from payment status (automatic via Razorpay).
 */
const DELIVERY_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'preparing',
  'ready_to_ship',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled'
];

const DELIVERY_LABELS = {
  pending: 'Pending',
  confirmed: 'Order Confirmed',
  processing: 'Processing',
  preparing: 'Product Being Prepared',
  ready_to_ship: 'Ready to Ship',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
};

/**
 * POST /api/orders - create a new order (guest or logged-in customer)
 * Body: { customer_name, customer_phone, customer_email, address, city, state, pincode,
 *         items: [{product_id, name, price, qty, size, color}], payment_method }
 * Razorpay is the ONLY supported payment method.
 * Returns the order with requires_payment: true.
 */
router.post('/', (req, res) => {
  const {
    customer_name, customer_phone, customer_email,
    address, city, state, pincode,
    items, payment_method, notes, user_id
  } = req.body || {};

  // Razorpay is the only payment method.
  const isRazorpay = payment_method === 'razorpay' || payment_method === 'online';
  if (!isRazorpay) {
    return res.status(400).json({
      success: false,
      message: 'Online payment via Razorpay is the only supported payment method at this time.'
    });
  }

  if (!customer_name || !customer_name.trim()) {
    return res.status(400).json({ success: false, message: 'Full name is required.' });
  }
  if (!customer_phone || !PHONE_RE.test(String(customer_phone))) {
    return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit mobile number.' });
  }
  if (!address || !address.trim()) return res.status(400).json({ success: false, message: 'Address is required.' });
  if (!city || !city.trim()) return res.status(400).json({ success: false, message: 'City is required.' });
  if (!state || !state.trim()) return res.status(400).json({ success: false, message: 'State is required.' });
  if (!pincode || !/^\d{6}$/.test(String(pincode))) {
    return res.status(400).json({ success: false, message: 'Please enter a valid 6-digit pincode.' });
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Your cart is empty.' });
  }

  let subtotal = 0;
  const validatedItems = [];
  for (const item of items) {
    const product = db.prepare('SELECT id, name, price, discounted_price, in_stock FROM products WHERE id = ?').get(item.product_id);
    if (!product) return res.status(400).json({ success: false, message: `Product not found (ID: ${item.product_id}).` });
    if (!product.in_stock) return res.status(400).json({ success: false, message: `${product.name} is currently out of stock.` });
    const qty = Math.max(1, parseInt(item.qty, 10) || 1);
    const unitPrice = product.discounted_price || product.price;
    const lineTotal = unitPrice * qty;
    subtotal += lineTotal;
    validatedItems.push({
      product_id: product.id,
      name: product.name,
      price: unitPrice,
      qty,
      size: item.size || 'Standard',
      color: item.color || 'Default'
    });
  }

  const settings = db.prepare('SELECT * FROM settings').all().reduce((acc, row) => { acc[row.key] = row.value; return acc; }, {});
  const shipping = Number(settings.delivery_charge || 0);
  const freeAbove = Number(settings.free_delivery_above || 0);
  const finalShipping = freeAbove && subtotal >= freeAbove ? 0 : shipping;
  const total = subtotal + finalShipping;

  const orderNumber = generateOrderNumber();

  const info = db.prepare(`
    INSERT INTO orders (order_number, user_id, customer_name, customer_email, customer_phone, address, city, state, pincode,
      items_json, subtotal, discount, shipping, total, payment_method, payment_status, order_status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    orderNumber,
    user_id || null,
    customer_name.trim(),
    customer_email || null,
    String(customer_phone),
    address.trim(),
    city.trim(),
    state.trim(),
    String(pincode),
    JSON.stringify(validatedItems),
    subtotal,
    0,
    finalShipping,
    total,
    'razorpay',
    'pending',
    'pending',
    notes || null
  );

  const orderId = info.lastInsertRowid;

  // Initial tracking entry
  db.prepare('INSERT INTO order_tracking (order_id, status, note) VALUES (?, ?, ?)')
    .run(orderId, 'pending', 'Order placed successfully. Awaiting payment confirmation.');

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);

  // Razorpay orders: return the order, the client proceeds to online payment.
  return res.status(201).json({
    success: true,
    message: 'Order created! Proceed to online payment.',
    order,
    requires_payment: true
  });
});

// ---------- GET /api/orders/track/:orderNumber ----------
router.get('/track/:orderNumber', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(req.params.orderNumber);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found. Please check the order number.' });
  order.items = JSON.parse(order.items_json || '[]');
  const tracking = db.prepare('SELECT status, note, created_at FROM order_tracking WHERE order_id = ? ORDER BY id DESC').all(order.id);
  res.json({ success: true, order, tracking });
});

// ---------- GET /api/orders/my (customer) ----------
router.get('/my', auth, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  orders.forEach(o => { o.items = JSON.parse(o.items_json || '[]'); });
  res.json({ success: true, orders });
});

// ---------- GET /api/orders/my/:id (customer detail) ----------
router.get('/my/:id', auth, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
  order.items = JSON.parse(order.items_json || '[]');
  const tracking = db.prepare('SELECT status, note, created_at FROM order_tracking WHERE order_id = ? ORDER BY id DESC').all(order.id);
  res.json({ success: true, order, tracking });
});

// ---------- GET /api/orders (admin - all orders) ----------
router.get('/', auth, adminOnly, (req, res) => {
  const { status } = req.query;
  let where = '1=1';
  const params = [];
  if (status) {
    where += ' AND order_status = ?';
    params.push(status);
  }
  const orders = db.prepare(`SELECT * FROM orders WHERE ${where} ORDER BY created_at DESC`).all(...params);
  orders.forEach(o => { o.items = JSON.parse(o.items_json || '[]'); });
  res.json({ success: true, orders });
});

// ---------- GET /api/orders/:id (admin detail) ----------
router.get('/:id', auth, adminOnly, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
  order.items = JSON.parse(order.items_json || '[]');
  const tracking = db.prepare('SELECT status, note, created_at FROM order_tracking WHERE order_id = ? ORDER BY id ASC').all(order.id);
  res.json({ success: true, order, tracking });
});

// ---------- PUT /api/orders/:id/status (admin - delivery status) ----------
router.put('/:id/status', auth, adminOnly, (req, res) => {
  const { status, order_status, note } = req.body || {};
  const resolvedStatus = status || order_status;
  if (!DELIVERY_STATUSES.includes(resolvedStatus)) {
    return res.status(400).json({ success: false, message: 'Invalid order status.' });
  }
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

  db.prepare(`UPDATE orders SET order_status = ?, delivery_status = ?, updated_at = datetime('now') WHERE id = ?`).run(resolvedStatus, resolvedStatus, order.id);
  db.prepare('INSERT INTO order_tracking (order_id, status, note) VALUES (?, ?, ?)')
    .run(order.id, resolvedStatus, note || DELIVERY_LABELS[resolvedStatus] || resolvedStatus);

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
  updated.items = JSON.parse(updated.items_json || '[]');
  const tracking = db.prepare('SELECT status, note, created_at FROM order_tracking WHERE order_id = ? ORDER BY id ASC').all(order.id);

  res.json({ success: true, message: 'Order status updated.', order: updated, tracking });
});

// ---------- PUT /api/orders/:id/update-customer (admin - full delivery update) ----------
router.put('/:id/update-customer', auth, adminOnly, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

  const { order_status, custom_message, estimated_delivery, courier_name, tracking_number } = req.body || {};
  const resolvedStatus = order_status || order.order_status || 'pending';
  if (!DELIVERY_STATUSES.includes(resolvedStatus)) {
    return res.status(400).json({ success: false, message: 'Invalid delivery status.' });
  }

  const msg = (custom_message !== undefined ? String(custom_message).trim() : (order.custom_message || '')).slice(0, 1000);
  const eta = (estimated_delivery !== undefined ? String(estimated_delivery).trim() : (order.estimated_delivery || '')).slice(0, 100);
  const courier = (courier_name !== undefined ? String(courier_name).trim() : (order.courier_name || '')).slice(0, 100);
  const trackNo = (tracking_number !== undefined ? String(tracking_number).trim() : (order.tracking_number || '')).slice(0, 100);

  db.prepare(`
    UPDATE orders SET
      order_status = ?,
      delivery_status = ?,
      custom_message = ?,
      estimated_delivery = ?,
      courier_name = ?,
      tracking_number = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(resolvedStatus, resolvedStatus, msg || null, eta || null, courier || null, trackNo || null, order.id);

  // Append a tracking entry so the customer sees the update in the timeline.
  let noteParts = [DELIVERY_LABELS[resolvedStatus] || resolvedStatus];
  if (eta) noteParts.push(`Estimated delivery: ${eta}`);
  if (courier) noteParts.push(`Courier: ${courier}`);
  if (trackNo) noteParts.push(`Tracking: ${trackNo}`);
  if (msg) noteParts.push(msg);
  const note = noteParts.join(' | ');

  db.prepare('INSERT INTO order_tracking (order_id, status, note) VALUES (?, ?, ?)')
    .run(order.id, resolvedStatus, note);

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
  updated.items = JSON.parse(updated.items_json || '[]');
  const tracking = db.prepare('SELECT status, note, created_at FROM order_tracking WHERE order_id = ? ORDER BY id ASC').all(order.id);

  res.json({
    success: true,
    message: 'Customer updated.',
    order: updated,
    tracking
  });
});

// ---------- PUT /api/orders/:id/payment (admin - legacy, kept but does NOT mark Razorpay paid) ----------
// NOTE: Razorpay payment status is managed automatically via signature verification + webhooks.
// This endpoint only allows 'pending'/'failed'/'refunded' for record-keeping; it can NEVER
// mark a Razorpay order as 'paid' from the admin panel.
router.put('/:id/payment', auth, adminOnly, (req, res) => {
  const { payment_status } = req.body || {};
  if (!['pending', 'failed', 'refunded'].includes(payment_status)) {
    return res.status(400).json({ success: false, message: 'Invalid payment status. Razorpay payments are updated automatically and cannot be set to paid manually.' });
  }
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
  if (order.payment_status === 'paid') {
    return res.status(400).json({ success: false, message: 'This order is already paid. Payment status is managed automatically via Razorpay.' });
  }
  db.prepare(`UPDATE orders SET payment_status = ?, updated_at = datetime('now') WHERE id = ?`).run(payment_status, order.id);
  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
  res.json({ success: true, message: 'Payment status updated.', order: updated });
});

module.exports = router;

