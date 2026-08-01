/**
 * Product routes - public catalog + admin CRUD with image upload.
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { db } = require('../db');
const { auth, adminOnly } = require('../middleware/auth');
const { slugify } = require('../utils/helpers');

const router = express.Router();

// ---------- Multer image upload ----------
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'prod-' + unique + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|gif/;
  const ok = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
  if (ok) cb(null, true);
  else cb(new Error('Only image files (jpg, png, webp, gif) are allowed.'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const imageUrl = (filename) => filename ? `/uploads/${filename}` : null;

// ---------- Public: GET /api/products ----------
router.get('/', (req, res) => {
  const { category, search, sort, featured, min, max, sizes } = req.query;
  let where = '1=1';
  const params = [];

  if (category) {
    where += ' AND c.slug = ?';
    params.push(category);
  }
  if (search) {
    where += ' AND (p.name LIKE ? OR p.description LIKE ? OR c.name LIKE ?)';
    const term = '%' + String(search).trim() + '%';
    params.push(term, term, term);
  }
  if (featured === '1' || featured === 'true') {
    where += ' AND p.featured = 1';
  }
  if (min !== undefined && min !== '') {
    where += ' AND p.price >= ?';
    params.push(Number(min));
  }
  if (max !== undefined && max !== '') {
    where += ' AND p.price <= ?';
    params.push(Number(max));
  }

  let orderBy = 'p.created_at DESC';
  if (sort === 'price_asc') orderBy = 'p.price ASC';
  else if (sort === 'price_desc') orderBy = 'p.price DESC';
  else if (sort === 'name_asc') orderBy = 'p.name ASC';
  else if (sort === 'newest') orderBy = 'p.created_at DESC';

  const products = db.prepare(`
    SELECT p.*, c.name AS category_name, c.slug AS category_slug,
      (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC, pi.id ASC LIMIT 1) AS image
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE ${where}
    ORDER BY ${orderBy}
  `).all(...params);

  res.json({ success: true, products });
});

// ---------- Public: GET /api/products/new-arrivals ----------
router.get('/new-arrivals', (req, res) => {
  const products = db.prepare(`
    SELECT p.*, c.name AS category_name, c.slug AS category_slug,
      (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC, pi.id ASC LIMIT 1) AS image
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    ORDER BY p.created_at DESC
    LIMIT 8
  `).all();
  res.json({ success: true, products });
});

// ---------- Public: GET /api/products/featured ----------
router.get('/featured', (req, res) => {
  const products = db.prepare(`
    SELECT p.*, c.name AS category_name, c.slug AS category_slug,
      (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC, pi.id ASC LIMIT 1) AS image
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.featured = 1
    ORDER BY p.created_at DESC
    LIMIT 8
  `).all();
  res.json({ success: true, products });
});

// ---------- Public: GET /api/products/slug/:slug ----------
router.get('/slug/:slug', (req, res) => {
  const product = db.prepare(`
    SELECT p.*, c.name AS category_name, c.slug AS category_slug
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.slug = ?
  `).get(req.params.slug);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
  product.sizes = JSON.parse(product.sizes || '[]');
  product.colors = JSON.parse(product.colors || '[]');
  product.images = db.prepare('SELECT id, image_url, is_primary FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, id ASC').all(product.id);
  res.json({ success: true, product });
});

// ---------- Public: GET /api/products/:id ----------
router.get('/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
  product.sizes = JSON.parse(product.sizes || '[]');
  product.colors = JSON.parse(product.colors || '[]');
  product.images = db.prepare('SELECT id, image_url, is_primary FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, id ASC').all(product.id);
  res.json({ success: true, product });
});

// ---------- Admin: POST /api/products ----------
router.post('/', auth, adminOnly, upload.array('images', 8), (req, res) => {
  const { name, description, price, discounted_price, category_id, sizes, colors, featured, in_stock, stock } = req.body;

  if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Product name is required.' });
  if (price === undefined || price === '' || Number(price) <= 0) {
    return res.status(400).json({ success: false, message: 'Please enter a valid price.' });
  }

  let slug = slugify(name);
  let exists = db.prepare('SELECT id FROM products WHERE slug = ?').get(slug);
  let i = 1;
  while (exists) {
    const s = slug + '-' + i;
    exists = db.prepare('SELECT id FROM products WHERE slug = ?').get(s);
    if (!exists) { slug = s; break; }
    i++;
  }

  const parseArr = (v) => {
    if (Array.isArray(v)) return JSON.stringify(v);
    if (typeof v === 'string' && v.trim()) {
      try { return JSON.stringify(JSON.parse(v)); } catch { return JSON.stringify(v.split(',').map(x => x.trim()).filter(Boolean)); }
    }
    return '[]';
  };

  const info = db.prepare(`
    INSERT INTO products (name, slug, description, price, discounted_price, category_id, sizes, colors, featured, in_stock, stock)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name.trim(), slug, description || '',
    Number(price), discounted_price !== '' && discounted_price !== undefined && discounted_price !== null ? Number(discounted_price) : null,
    category_id || null, parseArr(sizes), parseArr(colors),
    featured ? 1 : 0, in_stock !== undefined && in_stock !== '' ? (in_stock === '0' || in_stock === 0 || in_stock === 'false' ? 0 : 1) : 1,
    stock !== '' && stock !== undefined ? Number(stock) : 10
  );

  const productId = info.lastInsertRowid;

  // Save uploaded images
  const files = req.files || [];
  if (files.length) {
    const insertImg = db.prepare('INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, ?)');
    files.forEach((file, idx) => insertImg.run(productId, imageUrl(file.filename), idx === 0 ? 1 : 0));
  } else {
    // Fallback placeholder so product still has an image
    db.prepare('INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, ?)')
      .run(productId, 'https://placehold.co/800x1000/1a1a1a/e8c86b?text=Dhaage', 1);
  }

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  res.status(201).json({ success: true, message: 'Product created successfully.', product });
});

// ---------- Admin: PUT /api/products/:id ----------
router.put('/:id', auth, adminOnly, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

  const { name, description, price, discounted_price, category_id, sizes, colors, featured, in_stock, stock } = req.body;

  const newName = name !== undefined ? name : product.name;
  const newPrice = price !== undefined && price !== '' ? Number(price) : product.price;
  if (!newName.trim()) return res.status(400).json({ success: false, message: 'Product name is required.' });
  if (newPrice <= 0) return res.status(400).json({ success: false, message: 'Please enter a valid price.' });

  let slug = product.slug;
  if (name !== undefined && name.trim() !== product.name) {
    slug = slugify(newName) || product.slug;
  }

  const parseArr = (v, fallback) => {
    if (v === undefined) return JSON.stringify(fallback);
    if (Array.isArray(v)) return JSON.stringify(v);
    if (typeof v === 'string' && v.trim()) {
      try { return JSON.stringify(JSON.parse(v)); } catch { return JSON.stringify(v.split(',').map(x => x.trim()).filter(Boolean)); }
    }
    return JSON.stringify(fallback);
  };

  db.prepare(`
    UPDATE products SET
      name = ?, slug = ?, description = ?, price = ?, discounted_price = ?,
      category_id = ?, sizes = ?, colors = ?, featured = ?, in_stock = ?, stock = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    newName.trim(), slug,
    description !== undefined ? description : product.description,
    newPrice,
    discounted_price !== undefined && discounted_price !== '' && discounted_price !== null ? Number(discounted_price) : null,
    category_id !== undefined ? category_id : product.category_id,
    parseArr(sizes, JSON.parse(product.sizes || '[]')),
    parseArr(colors, JSON.parse(product.colors || '[]')),
    featured ? 1 : 0,
    in_stock !== undefined ? (in_stock === '0' || in_stock === 0 || in_stock === 'false' ? 0 : 1) : product.in_stock,
    stock !== undefined && stock !== '' ? Number(stock) : product.stock,
    product.id
  );

  const updated = db.prepare(`
    SELECT p.*, c.name AS category_name, c.slug AS category_slug FROM products p
    LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?
  `).get(product.id);
  updated.sizes = JSON.parse(updated.sizes || '[]');
  updated.colors = JSON.parse(updated.colors || '[]');
  updated.images = db.prepare('SELECT id, image_url, is_primary FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, id ASC').all(product.id);

  res.json({ success: true, message: 'Product updated successfully.', product: updated });
});

// ---------- Admin: POST /api/products/:id/images ----------
router.post('/:id/images', auth, adminOnly, upload.array('images', 8), (req, res) => {
  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

  const files = req.files || [];
  if (!files.length) return res.status(400).json({ success: false, message: 'No images uploaded.' });

  const hasImages = db.prepare('SELECT COUNT(*) AS c FROM product_images WHERE product_id = ?').get(product.id).c > 0;
  const insertImg = db.prepare('INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, ?)');
  files.forEach((file, idx) => insertImg.run(product.id, imageUrl(file.filename), !hasImages && idx === 0 ? 1 : 0));

  const images = db.prepare('SELECT id, image_url, is_primary FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, id ASC').all(product.id);
  res.json({ success: true, message: 'Images uploaded successfully.', images });
});

// ---------- Admin: DELETE /api/products/images/:imageId ----------
router.delete('/images/:imageId', auth, adminOnly, (req, res) => {
  const img = db.prepare('SELECT * FROM product_images WHERE id = ?').get(req.params.imageId);
  if (!img) return res.status(404).json({ success: false, message: 'Image not found.' });

  // Delete file from disk if it's a local upload
  if (img.image_url && img.image_url.startsWith('/uploads/')) {
    const filePath = path.join(UPLOAD_DIR, path.basename(img.image_url));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  db.prepare('DELETE FROM product_images WHERE id = ?').run(img.id);

  // Ensure at least one primary image remains
  const count = db.prepare('SELECT COUNT(*) AS c FROM product_images WHERE product_id = ?').get(img.product_id).c;
  if (count > 0) {
    const anyPrimary = db.prepare('SELECT COUNT(*) AS c FROM product_images WHERE product_id = ? AND is_primary = 1').get(img.product_id).c;
    if (anyPrimary === 0) {
      db.prepare('UPDATE product_images SET is_primary = 1 WHERE product_id = ? ORDER BY id ASC LIMIT 1').run(img.product_id);
    }
  }

  res.json({ success: true, message: 'Image deleted successfully.' });
});

// ---------- Admin: DELETE /api/products/:id ----------
router.delete('/:id', auth, adminOnly, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

  const images = db.prepare('SELECT image_url FROM product_images WHERE product_id = ?').all(product.id);
  for (const img of images) {
    if (img.image_url && img.image_url.startsWith('/uploads/')) {
      const filePath = path.join(UPLOAD_DIR, path.basename(img.image_url));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  }

  db.prepare('DELETE FROM products WHERE id = ?').run(product.id);
  res.json({ success: true, message: 'Product deleted successfully.' });
});

module.exports = router;

