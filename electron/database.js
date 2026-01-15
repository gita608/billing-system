const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const fs = require('fs');
const crypto = require('crypto');

/**
 * Database Manager for Restaurant POS
 * Handles all database operations using SQLite
 */

let db = null;

/**
 * Get database path
 */
function getDatabasePath() {
  const userDataPath = app.getPath('userData');
  const dbDir = path.join(userDataPath, 'database');
  
  // Create database directory if it doesn't exist
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  return path.join(dbDir, 'restaurant-pos.db');
}

/**
 * Initialize database connection and create tables
 */
function initializeDatabase() {
  if (db) {
    return db;
  }

  const dbPath = getDatabasePath();
  db = new Database(dbPath);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create tables
  createTables();

  // Insert default data if tables are empty
  insertDefaultData();

  console.log('Database initialized at:', dbPath);
  return db;
}

/**
 * Create all database tables
 */
function createTables() {
  // Categories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      display_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Menu items table (with inventory fields)
  db.exec(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      code TEXT UNIQUE,
      price REAL NOT NULL DEFAULT 0,
      description TEXT,
      image_path TEXT,
      is_available INTEGER DEFAULT 1,
      display_order INTEGER DEFAULT 0,
      stock_quantity INTEGER DEFAULT 0,
      low_stock_threshold INTEGER DEFAULT 10,
      track_stock INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    )
  `);

  // Add stock columns if they don't exist (for existing databases)
  try {
    db.exec(`ALTER TABLE menu_items ADD COLUMN stock_quantity INTEGER DEFAULT 0`);
  } catch (e) { /* Column already exists */ }
  try {
    db.exec(`ALTER TABLE menu_items ADD COLUMN low_stock_threshold INTEGER DEFAULT 10`);
  } catch (e) { /* Column already exists */ }
  try {
    db.exec(`ALTER TABLE menu_items ADD COLUMN track_stock INTEGER DEFAULT 1`);
  } catch (e) { /* Column already exists */ }

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'cashier')),
      is_active INTEGER DEFAULT 1,
      last_login DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // User activity log
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Stock movements history
  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      menu_item_id INTEGER NOT NULL,
      movement_type TEXT NOT NULL CHECK(movement_type IN ('purchase', 'sale', 'adjustment', 'waste')),
      quantity INTEGER NOT NULL,
      previous_stock INTEGER NOT NULL,
      new_stock INTEGER NOT NULL,
      reference_id TEXT,
      notes TEXT,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (menu_item_id) REFERENCES menu_items(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Orders table
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      order_type TEXT NOT NULL,
      bill_number TEXT,
      customer_name TEXT,
      contact_no TEXT,
      payment_mode TEXT DEFAULT 'Cash',
      subtotal REAL DEFAULT 0,
      tax REAL DEFAULT 0,
      total REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Order items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      menu_item_id INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      rate REAL NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
    )
  `);

  // Work periods table
  db.exec(`
    CREATE TABLE IF NOT EXISTS work_periods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      start_time DATETIME NOT NULL,
      end_time DATETIME,
      operator_name TEXT NOT NULL,
      opening_cash REAL DEFAULT 0,
      closing_cash REAL DEFAULT 0,
      total_sales REAL DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(menu_item_id);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at);
  `);
}

/**
 * Insert default data
 */
function insertDefaultData() {
  // Check if categories exist
  const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get();
  if (categoryCount.count === 0) {
    const insertCategory = db.prepare('INSERT INTO categories (name, display_order) VALUES (?, ?)');
    
    const defaultCategories = [
      ['SHAWARMA', 1],
      ['WRAP', 2],
      ['BURGER', 3],
      ['POTATO', 4],
      ['BREAKFAST', 5],
      ['BROAST', 6],
      ['DRINKS', 7],
      ['EXTRAS', 8],
    ];

    const insertMany = db.transaction((categories) => {
      for (const category of categories) {
        insertCategory.run(category[0], category[1]);
      }
    });

    insertMany(defaultCategories);
  }

  // Check if menu items exist - INSERT SAMPLE ITEMS
  const menuItemCount = db.prepare('SELECT COUNT(*) as count FROM menu_items').get();
  if (menuItemCount.count === 0) {
    // Get category IDs
    const categories = db.prepare('SELECT id, name FROM categories').all();
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.name] = cat.id;
    });

    const insertMenuItem = db.prepare('INSERT INTO menu_items (category_id, name, code, price, display_order) VALUES (?, ?, ?, ?, ?)');
    
    const defaultMenuItems = [
      // SHAWARMA items
      [categoryMap['SHAWARMA'], 'Chicken Shawarma', 'SHW001', 15.00, 1],
      [categoryMap['SHAWARMA'], 'Beef Shawarma', 'SHW002', 18.00, 2],
      [categoryMap['SHAWARMA'], 'Mixed Shawarma', 'SHW003', 20.00, 3],
      [categoryMap['SHAWARMA'], 'Shawarma Plate', 'SHW004', 25.00, 4],
      
      // WRAP items
      [categoryMap['WRAP'], 'Chicken Wrap', 'WRP001', 12.00, 1],
      [categoryMap['WRAP'], 'Beef Wrap', 'WRP002', 14.00, 2],
      [categoryMap['WRAP'], 'Falafel Wrap', 'WRP003', 10.00, 3],
      
      // BURGER items
      [categoryMap['BURGER'], 'Classic Burger', 'BRG001', 18.00, 1],
      [categoryMap['BURGER'], 'Cheese Burger', 'BRG002', 20.00, 2],
      [categoryMap['BURGER'], 'Double Burger', 'BRG003', 25.00, 3],
      [categoryMap['BURGER'], 'Chicken Burger', 'BRG004', 16.00, 4],
      [categoryMap['BURGER'], 'Veggie Burger', 'BRG005', 14.00, 5],
      
      // POTATO items
      [categoryMap['POTATO'], 'French Fries (S)', 'POT001', 5.00, 1],
      [categoryMap['POTATO'], 'French Fries (M)', 'POT002', 8.00, 2],
      [categoryMap['POTATO'], 'French Fries (L)', 'POT003', 12.00, 3],
      [categoryMap['POTATO'], 'Loaded Fries', 'POT004', 15.00, 4],
      [categoryMap['POTATO'], 'Potato Wedges', 'POT005', 10.00, 5],
      
      // BREAKFAST items
      [categoryMap['BREAKFAST'], 'Eggs & Toast', 'BRK001', 12.00, 1],
      [categoryMap['BREAKFAST'], 'Pancakes', 'BRK002', 15.00, 2],
      [categoryMap['BREAKFAST'], 'Full Breakfast', 'BRK003', 25.00, 3],
      [categoryMap['BREAKFAST'], 'Omelette', 'BRK004', 14.00, 4],
      
      // BROAST items
      [categoryMap['BROAST'], 'Broast 2 Pcs', 'BRS001', 15.00, 1],
      [categoryMap['BROAST'], 'Broast 4 Pcs', 'BRS002', 28.00, 2],
      [categoryMap['BROAST'], 'Broast 8 Pcs', 'BRS003', 50.00, 3],
      [categoryMap['BROAST'], 'Broast Meal', 'BRS004', 35.00, 4],
      
      // DRINKS items
      [categoryMap['DRINKS'], 'Water', 'DRK001', 2.00, 1],
      [categoryMap['DRINKS'], 'Soft Drink', 'DRK002', 5.00, 2],
      [categoryMap['DRINKS'], 'Fresh Juice', 'DRK003', 10.00, 3],
      [categoryMap['DRINKS'], 'Tea', 'DRK004', 3.00, 4],
      [categoryMap['DRINKS'], 'Coffee', 'DRK005', 8.00, 5],
      [categoryMap['DRINKS'], 'Lemonade', 'DRK006', 7.00, 6],
      
      // EXTRAS items
      [categoryMap['EXTRAS'], 'Garlic Sauce', 'EXT001', 2.00, 1],
      [categoryMap['EXTRAS'], 'Tahini Sauce', 'EXT002', 2.00, 2],
      [categoryMap['EXTRAS'], 'Cheese Extra', 'EXT003', 3.00, 3],
      [categoryMap['EXTRAS'], 'Hummus', 'EXT004', 8.00, 4],
      [categoryMap['EXTRAS'], 'Pickles', 'EXT005', 3.00, 5],
    ];

    const insertManyItems = db.transaction((items) => {
      for (const item of items) {
        if (item[0]) { // Only insert if category exists
          insertMenuItem.run(item[0], item[1], item[2], item[3], item[4]);
        }
      }
    });

    insertManyItems(defaultMenuItems);
    console.log('Sample menu items inserted');
  }

  // Check if settings exist
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get();
  if (settingsCount.count === 0) {
    const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    
    const defaultSettings = [
      ['tax_rate', '5'],
      ['currency', 'SAR'],
      ['printer_name', ''],
      ['restaurant_name', 'Restaurant POS'],
      ['restaurant_address', ''],
      ['restaurant_phone', ''],
    ];

    const insertMany = db.transaction((settings) => {
      for (const setting of settings) {
        insertSetting.run(setting[0], setting[1]);
      }
    });

    insertMany(defaultSettings);
  }

  // Check if default admin user exists
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    // Create default admin user (password: admin123)
    const passwordHash = hashPassword('admin123');
    const insertUser = db.prepare(`
      INSERT INTO users (username, password_hash, full_name, role, is_active)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertUser.run('admin', passwordHash, 'Administrator', 'admin', 1);
    console.log('Default admin user created (username: admin, password: admin123)');
  }
}

/**
 * Hash password using SHA-256
 * @param {string} password - Plain text password
 * @returns {string} Hashed password
 */
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Verify password
 * @param {string} password - Plain text password
 * @param {string} hash - Stored hash
 * @returns {boolean} True if password matches
 */
function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

/**
 * Get database instance
 */
function getDatabase() {
  if (!db) {
    return initializeDatabase();
  }
  return db;
}

/**
 * Close database connection
 */
function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = {
  initializeDatabase,
  getDatabase,
  closeDatabase,
  getDatabasePath,
  hashPassword,
  verifyPassword,
};
