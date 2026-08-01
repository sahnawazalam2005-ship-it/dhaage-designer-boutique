/**
 * Banner routes - public read + admin CRUD.
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { db } = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, 'banner-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ok = /jpeg|jpg|png|webp|gif/.test(path.extname(file.originalname).toLowerCase());
    ok ? cb(null, true) : cb(new Error('Only image files are allowed.'));
  },
  limits: { fileSize: 8 * 1024 * 1024 }
});

// GET /api/banners - public (active only unless ?all=1)
router.get('/', (req, res) => {
  const all = req.query.all === '1';
  const banners = all
    ? db.prepare('SELECT * FROM banners ORDER BY sort_order ASC, id ASC').all()
    : db.prepare('SELECT * FROM banners WHERE active = 1 ORDER BY sort_order ASC, id ASC').all();
  res.json({ success: true, banners });
});

// POST /api/banners - admin
router.post('/', auth, adminOnly, upload.single('image'), (req, res) => {
  const { title, subtitle, link, active, sort_order } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ success: false, message: 'Banner title is required.' });
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : (req.body.image_url || null);
  const info = db.prepare(
    'INSERT INTO banners (title, subtitle, image_url, link, active, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(
    title.trim(), subtitle || '', imageUrl, link || '',
    active !== '0' && active !== 0 && active !== 'false' ? 1 : 0,
    sort_order !== '' && sort_order !== undefined ? Number(sort_order) : 0
  );
  const banner = db.prepare('SELECT * FROM banners WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ success: true, message: 'Banner created.', banner });
});

/**
 * Shared update logic for banners.
 * Used by both PUT /:id (REST) and POST /:id (browser multipart upload convention).
 */
function updateBanner(req, res) {
  const banner = db.prepare('SELECT * FROM banners WHERE id = ?').get(req.params.id);
  if (!banner) return res.status(404).json({ success: false, message: 'Banner not found.' });

  const { title, subtitle, link, active, sort_order } = req.body;
  let imageUrl = banner.image_url;
  if (req.file) {
    // delete old local file (never block the DB update if the file is missing/locked)
    if (banner.image_url && banner.image_url.startsWith('/uploads/')) {
      const fp = path.join(UPLOAD_DIR, path.basename(banner.image_url));
      try {
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      } catch (e) {
        console.warn('Could not remove old banner image:', e.message);
      }
    }
    imageUrl = `/uploads/${req.file.filename}`;
  } else if (req.body.image_url !== undefined) {
    imageUrl = req.body.image_url || null;
  }

  db.prepare('UPDATE banners SET title = ?, subtitle = ?, image_url = ?, link = ?, active = ?, sort_order = ? WHERE id = ?')
    .run(
      title !== undefined ? title.trim() : banner.title,
      subtitle !== undefined ? subtitle : banner.subtitle,
      imageUrl,
      link !== undefined ? link : banner.link,
      active !== undefined ? (active === '0' || active === 0 || active === 'false' ? 0 : 1) : banner.active,
      sort_order !== undefined && sort_order !== '' ? Number(sort_order) : banner.sort_order,
      banner.id
    );
  const updated = db.prepare('SELECT * FROM banners WHERE id = ?').get(banner.id);
  res.json({ success: true, message: 'Banner updated.', banner: updated });
}

// PUT /api/banners/:id - admin (REST)
router.put('/:id', auth, adminOnly, upload.single('image'), updateBanner);

// POST /api/banners/:id - admin (browser multipart upload convention used by api.upload)
router.post('/:id', auth, adminOnly, upload.single('image'), updateBanner);

// DELETE /api/banners/:id - admin
router.delete('/:id', auth, adminOnly, (req, res) => {
  const banner = db.prepare('SELECT * FROM banners WHERE id = ?').get(req.params.id);
  if (!banner) return res.status(404).json({ success: false, message: 'Banner not found.' });
  if (banner.image_url && banner.image_url.startsWith('/uploads/')) {
    const fp = path.join(UPLOAD_DIR, path.basename(banner.image_url));
    try {
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    } catch (e) {
      console.warn('Could not remove banner image file:', e.message);
    }
  }
  db.prepare('DELETE FROM banners WHERE id = ?').run(banner.id);
  res.json({ success: true, message: 'Banner deleted.' });
});

module.exports = router;

