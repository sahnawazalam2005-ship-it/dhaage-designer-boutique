/**
 * Authentication routes - Register, Login, Profile (customer & admin).
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const { auth, adminOnly, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[6-9]\d{9}$/;

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { name, email, phone, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
  }
  if (name.trim().length < 2) {
    return res.status(400).json({ success: false, message: 'Please enter a valid name.' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
  }
  if (phone && !PHONE_RE.test(String(phone))) {
    return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit Indian mobile number.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) {
    return res.status(409).json({ success: false, message: 'An account with this email already exists. Please login.' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const resInfo = db.prepare(
    'INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)'
  ).run(name.trim(), email.toLowerCase().trim(), phone || null, hash, 'customer');

  const user = db.prepare('SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?').get(resInfo.lastInsertRowid);
  const token = signToken(user);

  res.status(201).json({ success: true, message: 'Account created successfully. Welcome to Dhaage!', token, user });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase().trim());
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }
  const safe = { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, created_at: user.created_at };
  const token = signToken(safe);
  res.json({ success: true, message: 'Login successful!', token, user: safe });
});

// GET /api/auth/me - current user profile
router.get('/me', auth, (req, res) => {
  res.json({ success: true, user: req.user });
});

// PUT /api/auth/profile - update profile
router.put('/profile', auth, (req, res) => {
  const { name, phone } = req.body || {};
  if (name !== undefined && name.trim().length < 2) {
    return res.status(400).json({ success: false, message: 'Please enter a valid name.' });
  }
  if (phone !== undefined && phone && !PHONE_RE.test(String(phone))) {
    return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit Indian mobile number.' });
  }
  const newName = name !== undefined ? name.trim() : req.user.name;
  const newPhone = phone !== undefined ? (phone || null) : req.user.phone;
  db.prepare('UPDATE users SET name = ?, phone = ? WHERE id = ?').run(newName, newPhone, req.user.id);
  const updated = db.prepare('SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json({ success: true, message: 'Profile updated successfully.', user: updated });
});

// POST /api/auth/change-password
router.post('/change-password', auth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Current and new password are required.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password)) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.user.id);
  res.json({ success: true, message: 'Password changed successfully.' });
});

// GET /api/auth/users (admin) - list all customers
router.get('/users', auth, adminOnly, (req, res) => {
  const users = db.prepare(
    "SELECT id, name, email, phone, role, created_at FROM users WHERE role = 'customer' ORDER BY created_at DESC"
  ).all();
  res.json({ success: true, users });
});

module.exports = router;

