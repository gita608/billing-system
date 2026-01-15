const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const { getDatabasePath } = require('./database');

/**
 * Database Backup System
 * Creates automatic backups of the SQLite database
 */

/**
 * Create a backup of the database
 * @param {string} backupPath - Optional custom backup path
 * @returns {Promise<Object>} Backup result
 */
async function createBackup(backupPath = null) {
  try {
    const dbPath = getDatabasePath();
    
    if (!fs.existsSync(dbPath)) {
      return { success: false, error: 'Database file not found' };
    }

    // Create backup directory if it doesn't exist
    const backupDir = backupPath || path.join(app.getPath('userData'), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `restaurant-pos-backup-${timestamp}.db`;
    const fullBackupPath = path.join(backupDir, backupFileName);

    // Copy database file
    fs.copyFileSync(dbPath, fullBackupPath);

    // Clean up old backups (keep last 10)
    cleanupOldBackups(backupDir, 10);

    return {
      success: true,
      path: fullBackupPath,
      message: 'Backup created successfully',
    };
  } catch (error) {
    console.error('Backup error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Restore database from backup
 * @param {string} backupPath - Path to backup file
 * @returns {Promise<Object>} Restore result
 */
async function restoreBackup(backupPath) {
  try {
    if (!fs.existsSync(backupPath)) {
      return { success: false, error: 'Backup file not found' };
    }

    const dbPath = getDatabasePath();
    const dbDir = path.dirname(dbPath);

    // Create database directory if it doesn't exist
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Create a backup of current database before restoring
    const currentBackup = await createBackup();
    if (!currentBackup.success) {
      console.warn('Could not backup current database before restore');
    }

    // Copy backup file to database location
    fs.copyFileSync(backupPath, dbPath);

    return {
      success: true,
      message: 'Database restored successfully',
    };
  } catch (error) {
    console.error('Restore error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get list of available backups
 * @param {string} backupDir - Backup directory path
 * @returns {Array} List of backup files
 */
function getBackupList(backupDir = null) {
  try {
    const dir = backupDir || path.join(app.getPath('userData'), 'backups');
    
    if (!fs.existsSync(dir)) {
      return [];
    }

    const files = fs.readdirSync(dir)
      .filter(file => file.endsWith('.db') && file.includes('backup'))
      .map(file => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          size: stats.size,
          created: stats.birthtime,
        };
      })
      .sort((a, b) => b.created - a.created); // Newest first

    return files;
  } catch (error) {
    console.error('Error getting backup list:', error);
    return [];
  }
}

/**
 * Clean up old backups, keeping only the most recent N
 * @param {string} backupDir - Backup directory
 * @param {number} keepCount - Number of backups to keep
 */
function cleanupOldBackups(backupDir, keepCount = 10) {
  try {
    const backups = getBackupList(backupDir);
    
    if (backups.length > keepCount) {
      const toDelete = backups.slice(keepCount);
      toDelete.forEach(backup => {
        try {
          fs.unlinkSync(backup.path);
          console.log(`Deleted old backup: ${backup.name}`);
        } catch (error) {
          console.error(`Error deleting backup ${backup.name}:`, error);
        }
      });
    }
  } catch (error) {
    console.error('Error cleaning up backups:', error);
  }
}

/**
 * Schedule automatic backups
 * Creates a backup every day at a specified time
 */
function scheduleAutomaticBackups() {
  // Create daily backup at 2 AM
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(2, 0, 0, 0);
  
  const msUntilBackup = tomorrow.getTime() - now.getTime();
  
  setTimeout(() => {
    createBackup().then(result => {
      if (result.success) {
        console.log('Automatic backup created:', result.path);
      } else {
        console.error('Automatic backup failed:', result.error);
      }
    });
    
    // Schedule next backup (24 hours later)
    setInterval(() => {
      createBackup().then(result => {
        if (result.success) {
          console.log('Automatic backup created:', result.path);
        } else {
          console.error('Automatic backup failed:', result.error);
        }
      });
    }, 24 * 60 * 60 * 1000); // 24 hours
  }, msUntilBackup);
}

module.exports = {
  createBackup,
  restoreBackup,
  getBackupList,
  cleanupOldBackups,
  scheduleAutomaticBackups,
};
