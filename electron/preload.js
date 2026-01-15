/**
 * PHASE 2: Preload Script - Security Bridge
 * 
 * This script runs in a special context that has access to both:
 * - Node.js APIs (via Electron)
 * - DOM APIs (browser environment)
 * 
 * It acts as a secure bridge between Electron (main process) and React (renderer process).
 * 
 * Security Model:
 * - contextBridge: Safely exposes APIs to React without exposing Node.js directly
 * - ipcRenderer: Allows React to communicate with Electron main process
 * - All communication is asynchronous and secure
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expose protected methods that allow the renderer process (React)
 * to use Electron APIs safely
 * 
 * This API will be available in React as: window.electronAPI
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // ============================================
  // APP INFORMATION
  // ============================================
  
  /**
   * Get the current platform (win32, darwin, linux)
   */
  platform: process.platform,
  
  /**
   * Get app version
   * @returns {Promise<string>} App version string
   */
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  
  /**
   * Get platform information
   * @returns {Promise<string>} Platform string
   */
  getPlatform: () => ipcRenderer.invoke('app:get-platform'),
  
  // ============================================
  // WINDOW CONTROLS
  // ============================================
  
  /**
   * Minimize the window
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  
  /**
   * Maximize or restore the window
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  
  /**
   * Close the window
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  closeWindow: () => ipcRenderer.invoke('window:close'),
  
  // ============================================
  // DATABASE APIs
  // ============================================
  
  // Categories
  getCategories: () => ipcRenderer.invoke('db:get-categories'),
  getCategory: (id) => ipcRenderer.invoke('db:get-category', id),
  createCategory: (category) => ipcRenderer.invoke('db:create-category', category),
  updateCategory: (id, category) => ipcRenderer.invoke('db:update-category', id, category),
  deleteCategory: (id) => ipcRenderer.invoke('db:delete-category', id),
  
  // Menu Items
  getMenuItems: (categoryId) => ipcRenderer.invoke('db:get-menu-items', categoryId),
  getMenuItem: (id) => ipcRenderer.invoke('db:get-menu-item', id),
  createMenuItem: (item) => ipcRenderer.invoke('db:create-menu-item', item),
  updateMenuItem: (id, item) => ipcRenderer.invoke('db:update-menu-item', id, item),
  deleteMenuItem: (id) => ipcRenderer.invoke('db:delete-menu-item', id),
  
  // Orders
  createOrder: (orderData) => ipcRenderer.invoke('db:create-order', orderData),
  getOrders: (filters) => ipcRenderer.invoke('db:get-orders', filters),
  getOrder: (id) => ipcRenderer.invoke('db:get-order', id),
  updateOrderStatus: (id, status) => ipcRenderer.invoke('db:update-order-status', id, status),
  
  // Work Periods
  startWorkPeriod: (data) => ipcRenderer.invoke('db:start-work-period', data),
  endWorkPeriod: (id, data) => ipcRenderer.invoke('db:end-work-period', id, data),
  getActiveWorkPeriod: () => ipcRenderer.invoke('db:get-active-work-period'),
  getWorkPeriods: (limit) => ipcRenderer.invoke('db:get-work-periods', limit),
  
  // Settings
  getSettings: () => ipcRenderer.invoke('db:get-settings'),
  updateSetting: (key, value) => ipcRenderer.invoke('db:update-setting', key, value),
  
  // Reports
  getSalesReport: (filters) => ipcRenderer.invoke('db:get-sales-report', filters),
  
  // ============================================
  // BACKUP APIs
  // ============================================
  
  createBackup: () => ipcRenderer.invoke('backup:create'),
  restoreBackup: (backupPath) => ipcRenderer.invoke('backup:restore', backupPath),
  getBackupList: () => ipcRenderer.invoke('backup:list'),
  
  // ============================================
  // PRINTER APIs
  // ============================================
  
  getAvailablePrinters: () => ipcRenderer.invoke('printer:get-available'),
  testPrinter: (printerName) => ipcRenderer.invoke('printer:test', printerName),
  printBill: (orderId) => ipcRenderer.invoke('printer:print-bill', orderId),
  printKOT: (orderId) => ipcRenderer.invoke('printer:print-kot', orderId),
  
  // ============================================
  // AUTHENTICATION APIs
  // ============================================
  
  login: (username, password) => ipcRenderer.invoke('auth:login', username, password),
  logout: () => ipcRenderer.invoke('auth:logout'),
  getCurrentUser: () => ipcRenderer.invoke('auth:get-current-user'),
  
  // ============================================
  // USER MANAGEMENT APIs
  // ============================================
  
  getUsers: () => ipcRenderer.invoke('users:get-all'),
  createUser: (userData) => ipcRenderer.invoke('users:create', userData),
  updateUser: (id, userData) => ipcRenderer.invoke('users:update', id, userData),
  deleteUser: (id) => ipcRenderer.invoke('users:delete', id),
  getUserActivityLog: (userId, limit) => ipcRenderer.invoke('users:get-activity-log', userId, limit),
  
  // ============================================
  // INVENTORY APIs
  // ============================================
  
  getInventory: () => ipcRenderer.invoke('inventory:get-all'),
  getLowStockItems: () => ipcRenderer.invoke('inventory:get-low-stock'),
  updateStock: (itemId, quantity, movementType, notes) => ipcRenderer.invoke('inventory:update-stock', itemId, quantity, movementType, notes),
  setStock: (itemId, quantity, notes) => ipcRenderer.invoke('inventory:set-stock', itemId, quantity, notes),
  updateInventorySettings: (itemId, settings) => ipcRenderer.invoke('inventory:update-settings', itemId, settings),
  getStockHistory: (itemId, limit) => ipcRenderer.invoke('inventory:get-history', itemId, limit),
  
  // File System APIs (if needed)
  // saveReport: (data) => ipcRenderer.invoke('fs-save-report', data),
  
  // ============================================
  // EVENT LISTENERS (for future use)
  // ============================================
  
  /**
   * Listen for events from main process
   * Example: window.electronAPI.on('update-available', (data) => {...})
   */
  on: (channel, callback) => {
    // Whitelist channels for security
    const validChannels = ['update-available', 'order-updated', 'printer-status'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
  
  /**
   * Remove event listener
   */
  removeListener: (channel, callback) => {
    const validChannels = ['update-available', 'order-updated', 'printer-status'];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeListener(channel, callback);
    }
  },
});

// Log that preload script has loaded
console.log('Preload script loaded - Electron APIs exposed to React');
