/**
 * Shared helper utilities.
 */
const crypto = require('crypto');

/** Generate a unique order number like DHA-2025-XXXXXX */
function generateOrderNumber() {
  const date = new Date();
  const y = date.getFullYear();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `DHA-${y}-${rand}`;
}

/** Generate a unique tracking ID */
function generateTrackingId() {
  return 'TRK' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

/** Slugify a string for clean URLs */
function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Format a number as Indian Rupee currency */
function formatINR(amount) {
  return '₹' + Number(amount || 0).toLocaleString('en-IN');
}

/** Compute discount percent between original and discounted price */
function discountPercent(price, discountedPrice) {
  if (!price || !discountedPrice) return 0;
  return Math.round(((price - discountedPrice) / price) * 100);
}

/** Build a WhatsApp wa.me link with a pre-filled order message */
function buildWhatsAppLink(phoneNumber, message) {
  const clean = String(phoneNumber || '').replace(/\D/g, '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

module.exports = {
  generateOrderNumber,
  generateTrackingId,
  slugify,
  formatINR,
  discountPercent,
  buildWhatsAppLink
};

