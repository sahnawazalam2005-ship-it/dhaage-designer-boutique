/**
 * Category routes - public read + admin CRUD.
 */
const express = require('express');
const { db } = require('../db');
const { auth, adminOnly } = require('../middleware/auth');
const { slugify } = require('../utils/helpers');

const router = express.Router();

// GET /api/categories - public
router.get('/', (req, res) => {
  const categories = db.prepare(
    `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
     FROM categories c ORDER BY c.name ASC`
  ).all();
  res.json({ success: true, categories });
});

// GET /api/categories/:id - public
router.get('/:id', (req, res) => {
  const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!cat) return res.status(404).json({ success: false, message: 'Category not found.' });
  res.json({ success: true, category: cat });
});

// POST /api/categories - admin
router.post('/', auth, adminOnly, (req, res) => {
  const { name, description, image } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Category name is required.' });
  }
  let slug = slugify(name);
  if (!slug) slug = 'category-' + Date.now();
  // ensure unique slug
  let exists = db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug);
  let i = 1;
  while (exists) {
    const s = slug + '-' + i;
    exists = db.prepare('SELECT id FROM categories WHERE slug = ?').get(s);
    if (!exists) { slug = s; break; }
    i++;
  }
  const info = db.prepare('INSERT INTO categories (name, slug, description, image) VALUES (?, ?, ?, ?)')
    .run(name.trim(), slug, description || '', image || null);
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ success: true, message: 'Category created successfully.', category });
});

// PUT /api/categories/:id - admin
router.put('/:id', auth, adminOnly, (req, res) => {
  const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!cat) return res.status(404).json({ success: false, message: 'Category not found.' });

  const { name, description, image } = req.body || {};
  const newName = (name !== undefined ? name : cat.name);
  if (!newName.trim()) {
    return res.status(400).json({ success: false, message: 'Category name is required.' });
  }
  let slug = cat.slug;
  if (name !== undefined && name.trim() !== cat.name) {
    slug = slugify(newName) || cat.slug;
  }
  db.prepare('UPDATE categories SET name = ?, slug = ?, description = ?, image = ? WHERE id = ?')
    .run(newName.trim(), slug, description !== undefined ? description : cat.description, image !== undefined ? image : cat.image, cat.id);
  const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(cat.id);
  res.json({ success: true, message: 'Category updated successfully.', category: updated });
});

// DELETE /api/categories/:id - admin
router.delete('/:id', auth, adminOnly, (req, res) => {
  const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!cat) return res.status(404).json({ success: false, message: 'Category not found.' });
  db.prepare('DELETE FROM categories WHERE id = ?').run(cat.id);
  res.json({ success: true, message: 'Category deleted successfully.' });
});

module.exports = router;

