/**
 * Razorpay integration — Server-side payment utilities.
 *
 * SECURITY:
 * - RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are read from server/.env ONLY.
 * - RAZORPAY_KEY_SECRET is NEVER exposed to the browser, logs, or API responses.
 * - All amounts are computed on the server from the SQLite database (never trusted from the browser).
 * - Payment signatures are verified here using HMAC SHA-256 before any order is marked paid.
 */
const crypto = require('crypto');

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

// Lazily initialised Razorpay client (only when keys are present).
let razorpayClient = null;
function getRazorpay() {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) return null;
  if (!razorpayClient) {
    // eslint-disable-next-line global-require
    const Razorpay = require('razorpay');
    razorpayClient = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET
    });
  }
  return razorpayClient;
}

/** Whether Razorpay keys are configured on the server. */
function isRazorpayConfigured() {
  // Keys must be present AND not be placeholder values.
  const validKeyId = RAZORPAY_KEY_ID && RAZORPAY_KEY_ID.startsWith('rzp_') && !RAZORPAY_KEY_ID.includes('ENTER_YOUR');
  const validSecret = RAZORPAY_KEY_SECRET && RAZORPAY_KEY_SECRET.length >= 10 && !RAZORPAY_KEY_SECRET.includes('ENTER_YOUR');
  return Boolean(validKeyId && validSecret);
}

/** Get the lazily-created Razorpay client instance (null if not configured). */
function getRazorpayInstance() {
  return getRazorpay();
}

/** Convert INR to paise (Razorpay requires amounts in paise). */
function toPaise(amountINR) {
  return Math.round(Number(amountINR) * 100);
}

/**
 * Create a Razorpay Order.
 * @param {number} amountINR - final amount in INR (computed server-side from DB)
 * @param {string} receipt   - unique receipt id (e.g. order number)
 * @param {object} notes     - optional notes passed to Razorpay
 */
async function createRazorpayOrder(amountINR, receipt, notes = {}) {
  const rp = getRazorpay();
  if (!rp) {
    const err = new Error('Razorpay is not configured on the server.');
    err.status = 503;
    throw err;
  }
  const options = {
    amount: toPaise(amountINR),
    currency: 'INR',
    receipt: String(receipt).slice(0, 40),
    notes,
    payment_capture: 1
  };
  return rp.orders.create(options);
}

/**
 * Verify a Razorpay payment signature using HMAC SHA-256.
 * MUST run on the server before marking an order as paid.
 */
function verifyPaymentSignature({ order_id, payment_id, signature }) {
  if (!order_id || !payment_id || !signature || !RAZORPAY_KEY_SECRET) return false;
  const body = `${order_id}|${payment_id}`;
  const expected = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(String(signature), 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Verify a Razorpay webhook signature (X-Razorpay-Signature header).
 * Uses RAZORPAY_WEBHOOK_SECRET if set, otherwise falls back to the key secret.
 * @param {Buffer|string} rawBody - raw request body as received
 * @param {string} signature      - value of X-Razorpay-Signature header
 */
function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || RAZORPAY_KEY_SECRET;
  if (!rawBody || !signature || !secret) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(String(signature), 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = {
  RAZORPAY_KEY_ID,
  isRazorpayConfigured,
  getRazorpayInstance,
  createRazorpayOrder,
  verifyPaymentSignature,
  verifyWebhookSignature
};

