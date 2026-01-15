const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { initializeDatabase, getDatabase, closeDatabase, hashPassword, verifyPassword } = require('./database');
const { printBill, printKOT, testPrinter, getAvailablePrinters } = require('./printer');
const { createBackup, restoreBackup, getBackupList, scheduleAutomaticBackups } = require('./backup');

/**
 * PHASE 2: App Shell (Foundation)
 * 
 * This file contains the Electron main process - the "backend" of your desktop app.
 * It runs in Node.js and has full access to the operating system.
 * 
 * Key Concepts:
 * - Main Process: This file runs in Node.js, can access file system, databases, etc.
 * - Renderer Process: React app runs in a browser-like environment (limited access)
 * - IPC (Inter-Process Communication): Secure way for React to communicate with Electron
 */

// Keep a global reference of the window object
// If you don't, the window will be closed automatically when the JavaScript object is garbage collected
let mainWindow = null;

// ============================================
// WINDOW STATE MANAGEMENT
// ============================================

/**
 * Get the path to the window state file
 * Stores window position and size for persistence
 */
function getWindowStatePath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'window-state.json');
}

/**
 * Load saved window state from disk
 * @returns {Object|null} Window state object or null if not found
 */
function loadWindowState() {
  try {
    const statePath = getWindowStatePath();
    if (fs.existsSync(statePath)) {
      const data = fs.readFileSync(statePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn('Failed to load window state:', error.message);
  }
  return null;
}

/**
 * Save window state to disk
 * @param {BrowserWindow} window - The window to save state for
 */
function saveWindowState(window) {
  try {
    const state = {
      width: window.getSize()[0],
      height: window.getSize()[1],
      x: window.getPosition()[0],
      y: window.getPosition()[1],
      isMaximized: window.isMaximized(),
    };
    
    const statePath = getWindowStatePath();
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  } catch (error) {
    console.warn('Failed to save window state:', error.message);
  }
}

/**
 * Get default window bounds (fallback if no saved state)
 * @returns {Object} Default window configuration
 */
function getDefaultWindowBounds() {
  return {
    width: 1920, // Optimized for POS displays
    height: 1080,
    x: undefined, // Let OS decide
    y: undefined, // Let OS decide
  };
}

/**
 * Creates the main application window
 * This is where we configure all window properties for our POS system
 */
function createWindow() {
  // Load saved window state or use defaults
  const savedState = loadWindowState();
  const defaultBounds = getDefaultWindowBounds();
  
  const windowConfig = {
    width: savedState?.width || defaultBounds.width,
    height: savedState?.height || defaultBounds.height,
    minWidth: 1280, // Minimum width for POS usability
    minHeight: 720, // Minimum height for POS usability
    
    // Restore position if available
    x: savedState?.x !== undefined ? savedState.x : defaultBounds.x,
    y: savedState?.y !== undefined ? savedState.y : defaultBounds.y,
    
    // Window appearance options (uncomment as needed):
    // frame: false,        // Remove window frame for full-screen POS experience
    // fullscreen: true,    // Start in fullscreen (kiosk mode)
    // kiosk: true,         // True kiosk mode (no way to exit without code)
    
    // Window behavior
    show: false, // Don't show until ready (prevents white flash)
    backgroundColor: '#ffffff', // Background color while loading
    
    // Security: WebPreferences configuration
    webPreferences: {
      // Preload script: Bridge between Electron and React
      preload: path.join(__dirname, 'preload.js'),
      
      // Security best practices:
      nodeIntegration: false,      // Don't expose Node.js APIs directly to React
      contextIsolation: true,      // Isolate Electron APIs from React code
      enableRemoteModule: false,   // Disable deprecated remote module
      sandbox: false,              // Allow preload script to work (needed for contextBridge)
    },
    
    // Window icon
    icon: path.join(__dirname, '../public/icon.png'),
  };
  
  // Create the browser window optimized for POS system
  mainWindow = new BrowserWindow(windowConfig);
  
  // Restore maximized state if it was maximized
  if (savedState?.isMaximized) {
    mainWindow.maximize();
  }

  // Show window when ready to render (prevents white flash)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
    
    // Optional: Maximize on first launch
    // mainWindow.maximize();
  });

  // Load the app
  // In development: Load from Vite dev server (hot reload)
  // In production: Load from built static files
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools in development for debugging
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // ============================================
  // SECURITY: Prevent unauthorized navigation
  // ============================================
  
  // Prevent navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    const allowedOrigins = ['http://localhost:5173', 'file://'];
    
    if (!allowedOrigins.some(origin => parsedUrl.origin === origin)) {
      console.warn('Blocked navigation to:', navigationUrl);
      event.preventDefault();
    }
  });

  // Prevent new window creation (security)
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  // ============================================
  // WINDOW LIFECYCLE EVENTS
  // ============================================
  
  // Emitted when the window is closed
  mainWindow.on('closed', () => {
    // Dereference the window object
    mainWindow = null;
  });

  // Handle window close (before closed event)
  mainWindow.on('close', (event) => {
    // Save window state before closing
    saveWindowState(mainWindow);
    
    // Optional: Prevent closing (e.g., if unsaved changes)
    // event.preventDefault();
    // return false;
  });
  
  // Save window state on move/resize (debounced)
  let saveStateTimeout;
  const debouncedSaveState = () => {
    clearTimeout(saveStateTimeout);
    saveStateTimeout = setTimeout(() => {
      if (!mainWindow.isMaximized()) {
        saveWindowState(mainWindow);
      }
    }, 500); // Save after 500ms of inactivity
  };
  
  mainWindow.on('moved', debouncedSaveState);
  mainWindow.on('resized', debouncedSaveState);

  // Handle window minimize
  mainWindow.on('minimize', () => {
    // Window minimized
  });

  // Handle window restore
  mainWindow.on('restore', () => {
    // Window restored
  });

  // ============================================
  // ERROR HANDLING
  // ============================================
  
  // Handle renderer process crashes
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('Renderer process crashed:', details);
    // Optionally reload the window
    // mainWindow.reload();
  });

  // Handle uncaught exceptions in renderer
  mainWindow.webContents.on('unresponsive', () => {
    console.warn('Window became unresponsive');
  });

  mainWindow.webContents.on('responsive', () => {
    // Window became responsive again
  });
}

// ============================================
// IPC HANDLERS: Secure communication with React
// ============================================

/**
 * IPC Handlers allow React to safely request actions from Electron
 * All handlers use ipcMain.handle() for secure request-response pattern
 */

// Example: Get app version
ipcMain.handle('app:get-version', () => {
  return app.getVersion();
});

// Example: Get platform info
ipcMain.handle('app:get-platform', () => {
  return process.platform;
});

// Window control handlers (for future use)
ipcMain.handle('window:minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
    return { success: true };
  }
  return { success: false, error: 'Window not available' };
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
    return { success: true };
  }
  return { success: false, error: 'Window not available' };
});

ipcMain.handle('window:close', () => {
  if (mainWindow) {
    mainWindow.close();
    return { success: true };
  }
  return { success: false, error: 'Window not available' };
});

// ============================================
// DATABASE IPC HANDLERS
// ============================================

// Categories
ipcMain.handle('db:get-categories', () => {
  try {
    const db = getDatabase();
    const categories = db.prepare('SELECT * FROM categories WHERE is_active = 1 ORDER BY display_order, name').all();
    return { success: true, data: categories };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:get-category', (event, id) => {
  try {
    const db = getDatabase();
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    return { success: true, data: category };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:create-category', (event, category) => {
  try {
    const db = getDatabase();
    const result = db.prepare('INSERT INTO categories (name, display_order) VALUES (?, ?)').run(category.name, category.display_order || 0);
    return { success: true, id: result.lastInsertRowid };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:update-category', (event, id, category) => {
  try {
    const db = getDatabase();
    db.prepare('UPDATE categories SET name = ?, display_order = ?, is_active = ? WHERE id = ?')
      .run(category.name, category.display_order || 0, category.is_active !== undefined ? category.is_active : 1, id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:delete-category', (event, id) => {
  try {
    const db = getDatabase();
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Menu Items
ipcMain.handle('db:get-menu-items', (event, categoryId = null) => {
  try {
    const db = getDatabase();
    let items;
    if (categoryId) {
      items = db.prepare('SELECT * FROM menu_items WHERE category_id = ? AND is_available = 1 ORDER BY display_order, name').all(categoryId);
    } else {
      items = db.prepare('SELECT mi.*, c.name as category_name FROM menu_items mi JOIN categories c ON mi.category_id = c.id WHERE mi.is_available = 1 ORDER BY c.display_order, mi.display_order, mi.name').all();
    }
    return { success: true, data: items };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:get-menu-item', (event, id) => {
  try {
    const db = getDatabase();
    const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id);
    return { success: true, data: item };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:create-menu-item', (event, item) => {
  try {
    const db = getDatabase();
    const result = db.prepare('INSERT INTO menu_items (category_id, name, code, price, description, display_order) VALUES (?, ?, ?, ?, ?, ?)')
      .run(item.category_id, item.name, item.code || null, item.price || 0, item.description || null, item.display_order || 0);
    return { success: true, id: result.lastInsertRowid };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:update-menu-item', (event, id, item) => {
  try {
    const db = getDatabase();
    db.prepare('UPDATE menu_items SET category_id = ?, name = ?, code = ?, price = ?, description = ?, is_available = ?, display_order = ? WHERE id = ?')
      .run(item.category_id, item.name, item.code || null, item.price || 0, item.description || null, item.is_available !== undefined ? item.is_available : 1, item.display_order || 0, id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:delete-menu-item', (event, id) => {
  try {
    const db = getDatabase();
    db.prepare('DELETE FROM menu_items WHERE id = ?').run(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Orders
ipcMain.handle('db:create-order', (event, orderData) => {
  try {
    const db = getDatabase();
    const generateOrderNumber = () => {
      const count = db.prepare('SELECT COUNT(*) as count FROM orders').get();
      return `OD-${String(count.count + 1).padStart(3, '0')}`;
    };

    const generateBillNumber = () => {
      const count = db.prepare('SELECT COUNT(*) as count FROM orders WHERE bill_number IS NOT NULL').get();
      return `INV-${String(count.count + 1).padStart(4, '0')}`;
    };

    const orderNumber = orderData.order_number || generateOrderNumber();
    const billNumber = orderData.bill_number || generateBillNumber();

    const result = db.prepare(`
      INSERT INTO orders (order_number, bill_number, order_type, customer_name, contact_no, payment_mode, subtotal, tax, total, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      orderNumber,
      billNumber,
      orderData.order_type || 'dine-in',
      orderData.customer_name || null,
      orderData.contact_no || null,
      orderData.payment_mode || 'Cash',
      orderData.subtotal || 0,
      orderData.tax || 0,
      orderData.total || 0,
      orderData.status || 'pending',
      orderData.notes || null
    );

    const orderId = result.lastInsertRowid;

    // Insert order items
    if (orderData.items && orderData.items.length > 0) {
      const insertItem = db.prepare('INSERT INTO order_items (order_id, menu_item_id, item_name, quantity, rate, notes) VALUES (?, ?, ?, ?, ?, ?)');
      const insertItems = db.transaction((items) => {
        for (const item of items) {
          insertItem.run(orderId, item.menu_item_id, item.item_name, item.quantity, item.rate, item.notes || null);
        }
      });
      insertItems(orderData.items);
    }

    return { success: true, id: orderId, order_number: orderNumber, bill_number: billNumber };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:get-orders', (event, filters = {}) => {
  try {
    const db = getDatabase();
    let query = 'SELECT * FROM orders WHERE 1=1';
    const params = [];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.order_type) {
      query += ' AND order_type = ?';
      params.push(filters.order_type);
    }
    if (filters.date_from) {
      query += ' AND DATE(created_at) >= ?';
      params.push(filters.date_from);
    }
    if (filters.date_to) {
      query += ' AND DATE(created_at) <= ?';
      params.push(filters.date_to);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(filters.limit || 100);

    const orders = db.prepare(query).all(...params);
    return { success: true, data: orders };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:get-order', (event, id) => {
  try {
    const db = getDatabase();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!order) {
      return { success: false, error: 'Order not found' };
    }
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
    return { success: true, data: { ...order, items } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:update-order-status', (event, id, status) => {
  try {
    const db = getDatabase();
    
    // Get previous status
    const order = db.prepare('SELECT status FROM orders WHERE id = ?').get(id);
    const previousStatus = order?.status;
    
    db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
    
    // If order is being completed, deduct stock (only if not already completed)
    if (status === 'completed' && previousStatus !== 'completed') {
      deductStockForOrder(id);
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Work Periods
ipcMain.handle('db:start-work-period', (event, data) => {
  try {
    const db = getDatabase();
    const result = db.prepare('INSERT INTO work_periods (start_time, operator_name, opening_cash, status) VALUES (?, ?, ?, ?)')
      .run(new Date().toISOString(), data.operator_name || 'Admin', data.opening_cash || 0, 'active');
    return { success: true, id: result.lastInsertRowid };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:end-work-period', (event, id, data) => {
  try {
    const db = getDatabase();
    // Calculate total sales for this period
    const sales = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as total_sales 
      FROM orders 
      WHERE status = 'completed' 
      AND created_at >= (SELECT start_time FROM work_periods WHERE id = ?)
      AND created_at <= ?
    `).get(id, new Date().toISOString());

    db.prepare('UPDATE work_periods SET end_time = ?, closing_cash = ?, total_sales = ?, status = ? WHERE id = ?')
      .run(new Date().toISOString(), data.closing_cash || 0, sales.total_sales, 'closed', id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:get-active-work-period', () => {
  try {
    const db = getDatabase();
    const period = db.prepare('SELECT * FROM work_periods WHERE status = "active" ORDER BY start_time DESC LIMIT 1').get();
    return { success: true, data: period || null };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:get-work-periods', (event, limit = 50) => {
  try {
    const db = getDatabase();
    const periods = db.prepare('SELECT * FROM work_periods ORDER BY start_time DESC LIMIT ?').all(limit);
    return { success: true, data: periods };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Settings
ipcMain.handle('db:get-settings', () => {
  try {
    const db = getDatabase();
    const settings = db.prepare('SELECT * FROM settings').all();
    const settingsObj = {};
    settings.forEach(s => {
      settingsObj[s.key] = s.value;
    });
    return { success: true, data: settingsObj };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:update-setting', (event, key, value) => {
  try {
    const db = getDatabase();
    db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run(key, value);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Reports
ipcMain.handle('db:get-sales-report', (event, filters = {}) => {
  try {
    const db = getDatabase();
    let query = 'SELECT * FROM orders WHERE status = "completed"';
    const params = [];

    if (filters.date_from) {
      query += ' AND DATE(created_at) >= ?';
      params.push(filters.date_from);
    }
    if (filters.date_to) {
      query += ' AND DATE(created_at) <= ?';
      params.push(filters.date_to);
    }

    query += ' ORDER BY created_at DESC';

    const orders = db.prepare(query).all(...params);
    
    const summary = {
      total_orders: orders.length,
      total_sales: orders.reduce((sum, o) => sum + (o.total || 0), 0),
      total_tax: orders.reduce((sum, o) => sum + (o.tax || 0), 0),
      total_subtotal: orders.reduce((sum, o) => sum + (o.subtotal || 0), 0),
    };

    return { success: true, data: { orders, summary } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// PRINTER IPC HANDLERS
// ============================================

// Get available printers
ipcMain.handle('printer:get-available', () => {
  try {
    const printers = getAvailablePrinters();
    return { success: true, data: printers };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Test printer
ipcMain.handle('printer:test', async (event, printerName = null) => {
  try {
    const result = await testPrinter(printerName);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Print bill receipt
ipcMain.handle('printer:print-bill', async (event, orderId) => {
  try {
    const db = getDatabase();
    
    // Get order data
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (!order) {
      return { success: false, error: 'Order not found' };
    }
    
    // Get order items
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
    const orderData = { ...order, items };
    
    // Get settings
    const settings = db.prepare('SELECT * FROM settings').all().reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
    
    const result = await printBill(orderData, settings);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Print KOT
ipcMain.handle('printer:print-kot', async (event, orderId) => {
  try {
    const db = getDatabase();
    
    // Get order data
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (!order) {
      return { success: false, error: 'Order not found' };
    }
    
    // Get order items
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
    const orderData = { ...order, items };
    
    // Get settings
    const settings = db.prepare('SELECT * FROM settings').all().reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
    
    const result = await printKOT(orderData, settings);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// BACKUP IPC HANDLERS
// ============================================

// Create backup
ipcMain.handle('backup:create', async () => {
  try {
    const result = await createBackup();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Restore backup
ipcMain.handle('backup:restore', async (event, backupPath) => {
  try {
    const result = await restoreBackup(backupPath);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get backup list
ipcMain.handle('backup:list', () => {
  try {
    const backups = getBackupList();
    return { success: true, data: backups };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// USER AUTHENTICATION IPC HANDLERS
// ============================================

// Store current logged-in user session
let currentUser = null;

// Login user
ipcMain.handle('auth:login', (event, username, password) => {
  try {
    const db = getDatabase();
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);
    
    if (!user) {
      return { success: false, error: 'Invalid username or password' };
    }
    
    if (!verifyPassword(password, user.password_hash)) {
      return { success: false, error: 'Invalid username or password' };
    }
    
    // Update last login
    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
    
    // Log activity
    db.prepare('INSERT INTO user_activity_log (user_id, action, details) VALUES (?, ?, ?)').run(user.id, 'login', 'User logged in');
    
    // Set current user (exclude password hash)
    currentUser = {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
    };
    
    return { success: true, data: currentUser };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Logout user
ipcMain.handle('auth:logout', () => {
  try {
    if (currentUser) {
      const db = getDatabase();
      db.prepare('INSERT INTO user_activity_log (user_id, action, details) VALUES (?, ?, ?)').run(currentUser.id, 'logout', 'User logged out');
    }
    currentUser = null;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get current logged-in user
ipcMain.handle('auth:get-current-user', () => {
  return { success: true, data: currentUser };
});

// Get all users (Admin only)
ipcMain.handle('users:get-all', () => {
  try {
    const db = getDatabase();
    const users = db.prepare('SELECT id, username, full_name, role, is_active, last_login, created_at FROM users ORDER BY created_at DESC').all();
    return { success: true, data: users };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Create new user
ipcMain.handle('users:create', (event, userData) => {
  try {
    const db = getDatabase();
    
    // Check if username exists
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(userData.username);
    if (existing) {
      return { success: false, error: 'Username already exists' };
    }
    
    const passwordHash = hashPassword(userData.password);
    const result = db.prepare(`
      INSERT INTO users (username, password_hash, full_name, role, is_active)
      VALUES (?, ?, ?, ?, ?)
    `).run(userData.username, passwordHash, userData.full_name, userData.role, userData.is_active !== undefined ? userData.is_active : 1);
    
    // Log activity
    if (currentUser) {
      db.prepare('INSERT INTO user_activity_log (user_id, action, details) VALUES (?, ?, ?)').run(currentUser.id, 'create_user', `Created user: ${userData.username}`);
    }
    
    return { success: true, id: result.lastInsertRowid };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Update user
ipcMain.handle('users:update', (event, id, userData) => {
  try {
    const db = getDatabase();
    
    // Check if username exists (for other users)
    if (userData.username) {
      const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(userData.username, id);
      if (existing) {
        return { success: false, error: 'Username already exists' };
      }
    }
    
    // Build update query dynamically
    const updates = [];
    const params = [];
    
    if (userData.username) {
      updates.push('username = ?');
      params.push(userData.username);
    }
    if (userData.full_name) {
      updates.push('full_name = ?');
      params.push(userData.full_name);
    }
    if (userData.role) {
      updates.push('role = ?');
      params.push(userData.role);
    }
    if (userData.is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(userData.is_active);
    }
    if (userData.password) {
      updates.push('password_hash = ?');
      params.push(hashPassword(userData.password));
    }
    
    if (updates.length === 0) {
      return { success: false, error: 'No updates provided' };
    }
    
    params.push(id);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    
    // Log activity
    if (currentUser) {
      db.prepare('INSERT INTO user_activity_log (user_id, action, details) VALUES (?, ?, ?)').run(currentUser.id, 'update_user', `Updated user ID: ${id}`);
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Delete user
ipcMain.handle('users:delete', (event, id) => {
  try {
    const db = getDatabase();
    
    // Prevent deleting own account
    if (currentUser && currentUser.id === id) {
      return { success: false, error: 'Cannot delete your own account' };
    }
    
    // Prevent deleting the last admin
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(id);
    if (user && user.role === 'admin') {
      const adminCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = "admin" AND is_active = 1').get();
      if (adminCount.count <= 1) {
        return { success: false, error: 'Cannot delete the last admin user' };
      }
    }
    
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    
    // Log activity
    if (currentUser) {
      db.prepare('INSERT INTO user_activity_log (user_id, action, details) VALUES (?, ?, ?)').run(currentUser.id, 'delete_user', `Deleted user ID: ${id}`);
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get user activity log
ipcMain.handle('users:get-activity-log', (event, userId = null, limit = 100) => {
  try {
    const db = getDatabase();
    let query = `
      SELECT ual.*, u.username, u.full_name 
      FROM user_activity_log ual 
      JOIN users u ON ual.user_id = u.id
    `;
    const params = [];
    
    if (userId) {
      query += ' WHERE ual.user_id = ?';
      params.push(userId);
    }
    
    query += ' ORDER BY ual.created_at DESC LIMIT ?';
    params.push(limit);
    
    const logs = db.prepare(query).all(...params);
    return { success: true, data: logs };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// INVENTORY IPC HANDLERS
// ============================================

// Get all inventory items with stock info
ipcMain.handle('inventory:get-all', () => {
  try {
    const db = getDatabase();
    const items = db.prepare(`
      SELECT mi.*, c.name as category_name 
      FROM menu_items mi 
      JOIN categories c ON mi.category_id = c.id 
      WHERE mi.track_stock = 1
      ORDER BY c.display_order, mi.name
    `).all();
    return { success: true, data: items };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get low stock items
ipcMain.handle('inventory:get-low-stock', () => {
  try {
    const db = getDatabase();
    const items = db.prepare(`
      SELECT mi.*, c.name as category_name 
      FROM menu_items mi 
      JOIN categories c ON mi.category_id = c.id 
      WHERE mi.track_stock = 1 AND mi.stock_quantity <= mi.low_stock_threshold
      ORDER BY mi.stock_quantity ASC
    `).all();
    return { success: true, data: items };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Update stock quantity
ipcMain.handle('inventory:update-stock', (event, itemId, quantity, movementType, notes = null) => {
  try {
    const db = getDatabase();
    
    // Get current stock
    const item = db.prepare('SELECT stock_quantity FROM menu_items WHERE id = ?').get(itemId);
    if (!item) {
      return { success: false, error: 'Item not found' };
    }
    
    const previousStock = item.stock_quantity || 0;
    let newStock;
    
    if (movementType === 'purchase' || movementType === 'adjustment') {
      newStock = previousStock + quantity;
    } else if (movementType === 'sale' || movementType === 'waste') {
      newStock = Math.max(0, previousStock - quantity);
    } else {
      return { success: false, error: 'Invalid movement type' };
    }
    
    // Update stock
    db.prepare('UPDATE menu_items SET stock_quantity = ? WHERE id = ?').run(newStock, itemId);
    
    // Log movement
    db.prepare(`
      INSERT INTO stock_movements (menu_item_id, movement_type, quantity, previous_stock, new_stock, notes, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(itemId, movementType, quantity, previousStock, newStock, notes, currentUser?.id || null);
    
    return { success: true, previous_stock: previousStock, new_stock: newStock };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Set stock quantity directly
ipcMain.handle('inventory:set-stock', (event, itemId, newQuantity, notes = null) => {
  try {
    const db = getDatabase();
    
    // Get current stock
    const item = db.prepare('SELECT stock_quantity FROM menu_items WHERE id = ?').get(itemId);
    if (!item) {
      return { success: false, error: 'Item not found' };
    }
    
    const previousStock = item.stock_quantity || 0;
    
    // Update stock
    db.prepare('UPDATE menu_items SET stock_quantity = ? WHERE id = ?').run(newQuantity, itemId);
    
    // Log movement as adjustment
    const quantity = Math.abs(newQuantity - previousStock);
    db.prepare(`
      INSERT INTO stock_movements (menu_item_id, movement_type, quantity, previous_stock, new_stock, notes, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(itemId, 'adjustment', quantity, previousStock, newQuantity, notes || 'Stock adjustment', currentUser?.id || null);
    
    return { success: true, previous_stock: previousStock, new_stock: newQuantity };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Update item stock settings (threshold, track_stock)
ipcMain.handle('inventory:update-settings', (event, itemId, settings) => {
  try {
    const db = getDatabase();
    
    const updates = [];
    const params = [];
    
    if (settings.low_stock_threshold !== undefined) {
      updates.push('low_stock_threshold = ?');
      params.push(settings.low_stock_threshold);
    }
    if (settings.track_stock !== undefined) {
      updates.push('track_stock = ?');
      params.push(settings.track_stock ? 1 : 0);
    }
    
    if (updates.length === 0) {
      return { success: false, error: 'No settings provided' };
    }
    
    params.push(itemId);
    db.prepare(`UPDATE menu_items SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get stock movement history for an item
ipcMain.handle('inventory:get-history', (event, itemId, limit = 50) => {
  try {
    const db = getDatabase();
    const movements = db.prepare(`
      SELECT sm.*, u.username, u.full_name as user_name
      FROM stock_movements sm
      LEFT JOIN users u ON sm.user_id = u.id
      WHERE sm.menu_item_id = ?
      ORDER BY sm.created_at DESC
      LIMIT ?
    `).all(itemId, limit);
    return { success: true, data: movements };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Deduct stock for completed order (called internally)
function deductStockForOrder(orderId) {
  try {
    const db = getDatabase();
    
    // Get order items
    const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
    const order = db.prepare('SELECT order_number FROM orders WHERE id = ?').get(orderId);
    
    for (const item of orderItems) {
      // Check if item tracks stock
      const menuItem = db.prepare('SELECT stock_quantity, track_stock FROM menu_items WHERE id = ?').get(item.menu_item_id);
      
      if (menuItem && menuItem.track_stock) {
        const previousStock = menuItem.stock_quantity || 0;
        const newStock = Math.max(0, previousStock - item.quantity);
        
        // Update stock
        db.prepare('UPDATE menu_items SET stock_quantity = ? WHERE id = ?').run(newStock, item.menu_item_id);
        
        // Log movement
        db.prepare(`
          INSERT INTO stock_movements (menu_item_id, movement_type, quantity, previous_stock, new_stock, reference_id, notes, user_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          item.menu_item_id, 
          'sale', 
          item.quantity, 
          previousStock, 
          newStock, 
          order?.order_number || orderId.toString(),
          `Order: ${order?.order_number || orderId}`,
          currentUser?.id || null
        );
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error deducting stock:', error);
    return false;
  }
}

// ============================================
// APP LIFECYCLE MANAGEMENT
// ============================================

/**
 * This method will be called when Electron has finished initialization
 * and is ready to create browser windows
 */
app.whenReady().then(() => {
  // Initialize database
  initializeDatabase();
  // Schedule automatic backups
  scheduleAutomaticBackups();
  createWindow();

  // macOS specific: Re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS, it's common for applications to stay active
  // until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    closeDatabase();
    app.quit();
  }
});

// Close database on app quit
app.on('will-quit', () => {
  closeDatabase();
});

// ============================================
// APP-LEVEL EVENT HANDLERS
// ============================================

// Handle second instance (prevent multiple instances if needed)
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Another instance is already running, quit this one
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance
    // Focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Handle certificate errors (for development)
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  // In development, ignore certificate errors
  if (process.env.NODE_ENV === 'development') {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});
