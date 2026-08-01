/**
 * Settings & Offers routes - public read of public settings + admin management.
 */
const express = require('express');
const { db } = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// GET /api/settings - public (only public-facing settings)
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM settings').all();
  const settings = rows.reduce((acc, row) => { acc[row.key] = row.value; return acc; }, {});
  const offers = db.prepare('SELECT * FROM offers WHERE active = 1 ORDER BY id DESC').all();
  res.json({ success: true, settings, offers });
});

// GET /api/settings/admin - all settings (admin)
router.get('/admin', auth, adminOnly, (req, res) => {
  const rows = db.prepare('SELECT * FROM settings').all();
  const settings = rows.reduce((acc, row) => { acc[row.key] = row.value; return acc; }, {});
  const offers = db.prepare('SELECT * FROM offers ORDER BY id DESC').all();
  res.json({ success: true, settings, offers });
});

// PUT /api/settings - update site settings (admin)
router.put('/', auth, adminOnly, (req, res) => {
  const updates = req.body || {};
  const allowedKeys = new Set([
    'site_name', 'site_tagline', 'whatsapp_number', 'instagram_url', 'map_embed',
    'address', 'phone_display', 'about_text', 'announcement', 'delivery_charge',
    'free_delivery_above', 'currency', 'payment_methods',
    'store_email', 'store_phone', 'store_address',
    'delivery_info', 'return_policy',
    'discount_banner_text', 'offer_title'
  ]);
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  let updated = 0;
  for (const [key, value] of Object.entries(updates)) {
    if (allowedKeys.has(key)) {
      stmt.run(key, String(value));
      updated++;
    }
  }
  res.json({ success: true, message: `Settings updated (${updated} fields).` });
});

// ---------- Offers CRUD ----------

// GET /api/settings/offers - all offers (admin)
router.get('/offers', auth, adminOnly, (req, res) => {
  const offers = db.prepare('SELECT * FROM offers ORDER BY id DESC').all();
  res.json({ success: true, offers });
});

// POST /api/settings/offers - create offer (admin)
router.post('/offers', auth, adminOnly, (req, res) => {
  const { title, code, discount_type, discount_value, valid_until } = req.body || {};
  if (!title || !title.trim()) return res.status(400).json({ success: false, message: 'Offer title is required.' });
  if (!discount_value || Number(discount_value) <= 0) return res.status(400).json({ success: false, message: 'Offer value must be greater than 0.' });
  if (discount_type === 'percent' && Number(discount_value) > 100) return res.status(400).json({ success: false, message: 'Percentage cannot exceed 100.' });

  const info = db.prepare(
    'INSERT INTO offers (title, code, discount_type, discount_value, valid_until) VALUES (?, ?, ?, ?, ?)'
  ).run(title.trim(), code || null, discount_type || 'percent', Number(discount_value), valid_until || null);
  const offer = db.prepare('SELECT * FROM offers WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ success: true, message: 'Offer created.', offer });
});

// PUT /api/settings/offers/:id - update offer (admin)
router.put('/offers/:id', auth, adminOnly, (req, res) => {
  const offer = db.prepare('SELECT * FROM offers WHERE id = ?').get(req.params.id);
  if (!offer) return res.status(404).json({ success: false, message: 'Offer not found.' });
  const { title, code, discount_type, discount_value, valid_until, active } = req.body || {};
  db.prepare('UPDATE offers SET title = ?, code = ?, discount_type = ?, discount_value = ?, valid_until = ?, active = ? WHERE id = ?')
    .run(
      title !== undefined ? title : offer.title,
      code !== undefined ? code : offer.code,
      discount_type !== undefined ? discount_type : offer.discount_type,
      discount_value !== undefined ? Number(discount_value) : offer.discount_value,
      valid_until !== undefined ? valid_until : offer.valid_until,
      active !== undefined ? (active === '0' || active === 0 || active === 'false' ? 0 : 1) : offer.active,
      offer.id
    );
  const updated = db.prepare('SELECT * FROM offers WHERE id = ?').get(offer.id);
  res.json({ success: true, message: 'Offer updated.', offer: updated });
});

// DELETE /api/settings/offers/:id (admin)
router.delete('/offers/:id', auth, adminOnly, (req, res) => {
  const offer = db.prepare('SELECT * FROM offers WHERE id = ?').get(req.params.id);
  if (!offer) return res.status(404).json({ success: false, message: 'Offer not found.' });
  db.prepare('DELETE FROM offers WHERE id = ?').run(offer.id);
  res.json({ success: true, message: 'Offer deleted.' });
});

// GET /api/settings/stats - dashboard statistics (admin)
router.get('/stats', auth, adminOnly, (req, res) => {
  const totalProducts = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
  const totalOrders = db.prepare('SELECT COUNT(*) AS c FROM orders').get().c;
  const totalCustomers = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'customer'").get().c;
  const totalRevenue = db.prepare("SELECT COALESCE(SUM(total), 0) AS s FROM orders WHERE order_status NOT IN ('cancelled')").get().s;
  const pendingOrders = db.prepare("SELECT COUNT(*) AS c FROM orders WHERE order_status = 'pending'").get().c;
  const lowStock = db.prepare('SELECT COUNT(*) AS c FROM products WHERE in_stock = 1 AND stock < 5').get().c;

  const monthly = db.prepare(`
    SELECT strftime('%Y-%m', created_at) AS month, COUNT(*) AS orders, COALESCE(SUM(total), 0) AS revenue
    FROM orders WHERE order_status NOT IN ('cancelled')
    GROUP BY month ORDER BY month DESC LIMIT 6
  `).all();

  const statusCounts = db.prepare('SELECT order_status AS status, COUNT(*) AS count FROM orders GROUP BY order_status').all();

  const recentOrders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 5').all();
  recentOrders.forEach(o => { o.items = JSON.parse(o.items_json || '[]'); });

  res.json({
    success: true,
    stats: {
      totalProducts, totalOrders, totalCustomers, totalRevenue,
      pendingOrders, lowStock, monthly, statusCounts, recentOrders
    }
  });
});

// GET /api/settings/customers - list all customers with order stats (admin)
router.get('/customers', auth, adminOnly, (req, res) => {
  const customers = db.prepare(`
    SELECT u.id, u.name, u.email, u.phone, u.created_at,
      (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count,
      (SELECT COALESCE(SUM(o.total), 0) FROM orders o WHERE o.user_id = u.id AND o.order_status NOT IN ('cancelled')) AS total_spent
    FROM users u WHERE u.role = 'customer' ORDER BY u.created_at DESC
  `).all();
  res.json({ success: true, customers });
});

module.exports = router;

