/**
 * Dhaage Designer Boutique - Database
 * Uses Node.js built-in `node:sqlite` (available in Node 22+).
 * Data is persisted in `server/data/dhaage.db` on disk.
 */
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const dbPath = path.join(DATA_DIR, 'dhaage.db');
const db = new DatabaseSync(dbPath);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON;');

/**
 * Initialize the database schema.
 * Runs CREATE TABLE IF NOT EXISTS for all tables.
 */
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      image TEXT,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      price REAL NOT NULL DEFAULT 0,
      discounted_price REAL,
      category_id INTEGER,
      sizes TEXT DEFAULT '[]',
      colors TEXT DEFAULT '[]',
      featured INTEGER DEFAULT 0,
      in_stock INTEGER DEFAULT 1,
      stock INTEGER DEFAULT 10,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS product_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      is_primary INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS banners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      subtitle TEXT,
      image_url TEXT,
      link TEXT,
      active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      address_line1 TEXT NOT NULL,
      address_line2 TEXT,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      pincode TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      user_id INTEGER,
      customer_name TEXT NOT NULL,
      customer_email TEXT,
      customer_phone TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      pincode TEXT NOT NULL,
      items_json TEXT NOT NULL,
      subtotal REAL NOT NULL,
      discount REAL DEFAULT 0,
      shipping REAL DEFAULT 0,
      total REAL NOT NULL,
      payment_method TEXT NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'pending',
      order_status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS order_tracking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      code TEXT UNIQUE,
      discount_type TEXT NOT NULL DEFAULT 'percent',
      discount_value REAL NOT NULL DEFAULT 0,
      active INTEGER DEFAULT 1,
      valid_until TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    -- Payment columns added via migration below
  `);

  // Add payment columns for Razorpay (idempotent migration)
  try { db.exec("ALTER TABLE orders ADD COLUMN razorpay_order_id TEXT DEFAULT NULL"); } catch (e) {}
  try { db.exec("ALTER TABLE orders ADD COLUMN razorpay_payment_id TEXT DEFAULT NULL"); } catch (e) {}
  try { db.exec("ALTER TABLE orders ADD COLUMN paid_at TEXT DEFAULT NULL"); } catch (e) {}
  try { db.exec("ALTER TABLE orders ADD COLUMN payment_token TEXT DEFAULT NULL"); } catch (e) {}

  // Add delivery/fulfillment update columns (idempotent migration)
  try { db.exec("ALTER TABLE orders ADD COLUMN delivery_status TEXT DEFAULT 'pending'"); } catch (e) {}
  try { db.exec("ALTER TABLE orders ADD COLUMN custom_message TEXT DEFAULT NULL"); } catch (e) {}
  try { db.exec("ALTER TABLE orders ADD COLUMN estimated_delivery TEXT DEFAULT NULL"); } catch (e) {}
  try { db.exec("ALTER TABLE orders ADD COLUMN courier_name TEXT DEFAULT NULL"); } catch (e) {}
  try { db.exec("ALTER TABLE orders ADD COLUMN tracking_number TEXT DEFAULT NULL"); } catch (e) {}

  // Table to log payment verification attempts (idempotency / audit)
  db.exec(`
    CREATE TABLE IF NOT EXISTS payment_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      razorpay_order_id TEXT,
      razorpay_payment_id TEXT,
      status TEXT NOT NULL,
      error_message TEXT,
      raw_response TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
    );
  `);
}

/**
 * Seed default data: admin user, default categories, sample products, banners, settings.
 */
function seedData() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM users').get();
  if (count.c === 0) {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@dhaage.com';
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
    const hash = bcrypt.hashSync(adminPass, 10);
    db.prepare(
      'INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)'
    ).run('Admin', adminEmail, '919923267780', hash, 'admin');
    console.log('✔ Admin user created:', adminEmail);
  }

  const catCount = db.prepare('SELECT COUNT(*) AS c FROM categories').get();
  if (catCount.c === 0) {
    const categories = [
      ['Sherwani', 'sherwani', 'Regal wedding sherwanis in rich fabrics', 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800'],
      ['Suits', 'suits', 'Sharp tailored suits for every occasion', 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800'],
      ['Blazers', 'blazers', 'Statement blazers with modern cuts', 'https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?w=800'],
      ['Indo-Western', 'indo-western', 'Fusion wear blending tradition with trend', 'https://images.unsplash.com/photo-1620173834206-c029bf322dba?w=800'],
      ['Kurtas', 'kurtas', 'Comfortable and elegant daily & festive kurtas', 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=800'],
      ['Wedding Wear', 'wedding-wear', 'Complete groom trousseau for the big day', 'https://images.unsplash.com/photo-1520975954732-35dd22299614?w=800']
    ];
    const insert = db.prepare('INSERT INTO categories (name, slug, description, image) VALUES (?, ?, ?, ?)');
    for (const c of categories) insert.run(...c);
    console.log('✔ Categories seeded');
  }

  const prodCount = db.prepare('SELECT COUNT(*) AS c FROM products').get();
  if (prodCount.c === 0) {
    const products = [
      ['Royal Gold Sherwani', 'royal-gold-sherwani', 'Handcrafted regal sherwani with intricate gold zari work, perfect for weddings.', 24999, 19999, 1, ['S','M','L','XL','XXL'], ['Gold','Maroon','Ivory'], 1],
      ['Classic Navy Suit', 'classic-navy-suit', 'Tailored two-piece navy suit in premium Italian wool blend.', 18999, 15999, 2, ['S','M','L','XL','XXL'], ['Navy','Black','Grey'], 1],
      ['Embroidered Indo-Western', 'embroidered-indo-western', 'Modern indo-western jacket with hand embroidery and mandarin collar.', 14999, 12999, 4, ['S','M','L','XL'], ['Black','Teal','Wine'], 1],
      ['Designer Kurta Set', 'designer-kurta-set', 'Premium cotton-silk kurta with churidar, ideal for festive evenings.', 5999, 4999, 5, ['S','M','L','XL','XXL'], ['White','Ivory','Sky Blue'], 1],
      ['Signature Black Blazer', 'signature-black-blazer', 'Sharp single-breasted blazer, a wardrobe essential.', 12999, 10999, 3, ['S','M','L','XL','XXL'], ['Black','Charcoal'], 1],
      ['Pastel Wedding Sherwani', 'pastel-wedding-sherwani', 'Trending pastel sherwani with subtle sequin detailing.', 22999, 18999, 1, ['S','M','L','XL'], ['Mint','Powder Blue','Beige'], 1],
      ['Silk Wedding Bandhgala', 'silk-wedding-bandhgala', 'Luxe silk bandhgala suit for the groom and groomsmen.', 26999, 21999, 6, ['M','L','XL','XXL'], ['Burgundy','Royal Blue','Black'], 1],
      ['Casual Linen Kurta', 'casual-linen-kurta', 'Lightweight breathable linen kurta for everyday elegance.', 3999, 2999, 5, ['S','M','L','XL','XXL'], ['White','Sand','Olive'], 1],
      ['Formal Charcoal Suit', 'formal-charcoal-suit', 'Three-piece charcoal suit for boardrooms and formal dos.', 19999, 16999, 2, ['S','M','L','XL','XXL'], ['Charcoal','Black'], 1],
      ['Festive Velvet Blazer', 'festive-velvet-blazer', 'Rich velvet blazer to elevate your festive look.', 13999, 11999, 3, ['S','M','L','XL'], ['Wine','Emerald','Midnight'], 1],
      ['Bandhgala Indo-Western', 'bandhgala-indo-western', 'Royal bandhgala jacket paired with matching trousers.', 16999, 13999, 4, ['S','M','L','XL','XXL'], ['Maroon','Navy','Black'], 1],
      ['Engagement Sherwani', 'engagement-sherwani', 'Contemporary sherwani with tonal embroidery for engagements.', 25999, 20999, 1, ['S','M','L','XL','XXL'], ['Ivory','Rose Gold','Black'], 1]
    ];
    const insert = db.prepare(`
      INSERT INTO products (name, slug, description, price, discounted_price, category_id, sizes, colors, featured, stock)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 15)
    `);
    const seedImages = [
      'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800',
      'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800',
      'https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?w=800',
      'https://images.unsplash.com/photo-1620173834206-c029bf322dba?w=800',
      'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=800',
      'https://images.unsplash.com/photo-1520975954732-35dd22299614?w=800',
      'https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?w=800',
      'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800'
    ];
    const imgInsert = db.prepare('INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, ?)');
    products.forEach((p, idx) => {
      const row = [
        p[0], p[1], p[2], p[3], p[4], p[5],
        JSON.stringify(p[6]), JSON.stringify(p[7])
      ];
      const res = insert.run(...row);
      const pid = res.lastInsertRowid;
      imgInsert.run(pid, seedImages[idx % seedImages.length], 1);
      imgInsert.run(pid, seedImages[(idx + 1) % seedImages.length], 0);
      imgInsert.run(pid, seedImages[(idx + 2) % seedImages.length], 0);
    });
    console.log('✔ Products seeded:', products.length);
  }

  const bannerCount = db.prepare('SELECT COUNT(*) AS c FROM banners').get();
  if (bannerCount.c === 0) {
    const insert = db.prepare('INSERT INTO banners (title, subtitle, image_url, link, active, sort_order) VALUES (?, ?, ?, ?, 1, ?)');
    insert.run('Dhaage Designer', 'Premium Menswear Boutique', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1600', '/shop', 0);
    insert.run('Wedding Season Edit', 'Crafted Sherwanis for your big day', 'https://images.unsplash.com/photo-1520975954732-35dd22299614?w=1600', '/category/wedding-wear', 1);
    insert.run('New Arrivals', 'The latest designer drops', 'https://images.unsplash.com/photo-1490367532201-b9f1f2aeb5d9?w=1600', '/shop', 2);
    console.log('✔ Banners seeded');
  }

  const settingCount = db.prepare('SELECT COUNT(*) AS c FROM settings').get();
  if (settingCount.c === 0) {
    const settings = {
      site_name: 'Dhaage Designer Mens Boutique',
      site_tagline: 'Premium Designer Menswear',
      whatsapp_number: process.env.WHATSAPP_NUMBER || '919923267780',
      instagram_url: 'https://instagram.com/dhaagedesigner',
      map_embed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3783.7!2d73.0!3d18.5!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMThMMzAnMDAuMCJOIDczVjAwJzAwLjAiRQ!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin',
      address: 'MG Road, Pune, Maharashtra 411001',
      phone_display: '+91 99232 67780',
      about_text: 'Dhaage Designer Mens Boutique crafts premium menswear for the modern gentleman. From regal sherwanis to sharp suits and elegant kurtas, every piece is tailored to perfection using luxurious fabrics and fine craftsmanship.',
      announcement: '✨ Festive Sale: Up to 30% OFF on select sherwanis & suits',
      delivery_charge: '0',
      free_delivery_above: '999',
      currency: '₹',
      payment_methods: 'razorpay'
    };
    const insert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    for (const [k, v] of Object.entries(settings)) insert.run(k, v);
    console.log('✔ Settings seeded');
  }
}

initSchema();
seedData();

module.exports = { db };

