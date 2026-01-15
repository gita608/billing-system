import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { currencies } from '../config/currencies';
import { billTemplates, getAllTemplates } from '../config/billTemplates';
import Header from './Header';
import './Settings.css';

function Settings() {
  const navigate = useNavigate();
  const { t, language, setLanguage, availableLanguages, isRTL } = useLanguage();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [backups, setBackups] = useState([]);
  const [printers, setPrinters] = useState([]);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    loadSettings();
    loadBackups();
    loadPrinters();
  }, []);

  const loadSettings = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.getSettings();
      if (result.success) {
        setSettings(result.data);
      }
      setLoading(false);
    }
  };

  const loadBackups = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.getBackupList();
      if (result.success) {
        setBackups(result.data);
      }
    }
  };

  const loadPrinters = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.getAvailablePrinters();
      if (result.success) {
        setPrinters(result.data);
      }
    }
  };

  const handleSave = async () => {
    if (window.electronAPI) {
      for (const [key, value] of Object.entries(settings)) {
        await window.electronAPI.updateSetting(key, value);
      }
      alert('Settings saved successfully!');
    }
  };

  const handleChange = (key, value) => {
    setSettings({ ...settings, [key]: value });
  };

  const handleCreateBackup = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.createBackup();
      if (result.success) {
        alert('Backup created successfully!\n\nLocation: ' + result.path);
        loadBackups();
      } else {
        alert('Backup failed: ' + result.error);
      }
    }
  };

  const handleRestoreBackup = async (backupPath) => {
    if (window.confirm('Are you sure you want to restore this backup?\n\nThis will replace all current data. A backup of current data will be created first.')) {
      if (window.electronAPI) {
        const result = await window.electronAPI.restoreBackup(backupPath);
        if (result.success) {
          alert('Database restored successfully!\n\nPlease restart the application for changes to take effect.');
        } else {
          alert('Restore failed: ' + result.error);
        }
      }
    }
  };

  const handleTestPrinter = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.testPrinter(settings.printer_name);
      if (result.success) {
        alert('Test print sent successfully!');
      } else {
        alert('Printer test failed: ' + result.error);
      }
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  if (loading) {
    return (
      <div className="settings-screen">
        <Header title="Settings" showBackButton={true} onBack={() => navigate('/')} />
        <div className="loading">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="settings-screen">
      <Header title="Settings" showBackButton={true} onBack={() => navigate('/')} />
      
      <div className="settings-content">
        <div className="settings-tabs">
          <button 
            className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            📝 {t('settings.general')}
          </button>
          <button 
            className={`tab-btn ${activeTab === 'language' ? 'active' : ''}`}
            onClick={() => setActiveTab('language')}
          >
            🌐 {t('settings.language')}
          </button>
          <button 
            className={`tab-btn ${activeTab === 'template' ? 'active' : ''}`}
            onClick={() => setActiveTab('template')}
          >
            🧾 {language === 'ar' ? 'قالب الفاتورة' : 'Bill Template'}
          </button>
          <button 
            className={`tab-btn ${activeTab === 'printer' ? 'active' : ''}`}
            onClick={() => setActiveTab('printer')}
          >
            🖨️ {t('settings.printer')}
          </button>
          <button 
            className={`tab-btn ${activeTab === 'backup' ? 'active' : ''}`}
            onClick={() => setActiveTab('backup')}
          >
            💾 {t('settings.backup')}
          </button>
        </div>

        {activeTab === 'general' && (
          <>
            <div className="settings-section">
              <h2>Restaurant Information</h2>
              <div className="settings-grid">
                <div className="setting-item">
                  <label>Restaurant Name</label>
                  <input
                    type="text"
                    value={settings.restaurant_name || ''}
                    onChange={(e) => handleChange('restaurant_name', e.target.value)}
                  />
                </div>
                <div className="setting-item">
                  <label>Address</label>
                  <input
                    type="text"
                    value={settings.restaurant_address || ''}
                    onChange={(e) => handleChange('restaurant_address', e.target.value)}
                  />
                </div>
                <div className="setting-item">
                  <label>Phone</label>
                  <input
                    type="text"
                    value={settings.restaurant_phone || ''}
                    onChange={(e) => handleChange('restaurant_phone', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="settings-section">
              <h2>{language === 'ar' ? 'الضريبة والتسعير' : 'Tax & Pricing'}</h2>
              <div className="settings-grid">
                <div className="setting-item">
                  <label>{t('settings.taxRate')}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={settings.tax_rate || '5'}
                    onChange={(e) => handleChange('tax_rate', e.target.value)}
                  />
                </div>
                <div className="setting-item">
                  <label>{t('settings.currency')}</label>
                  <select
                    value={settings.currency || 'SAR'}
                    onChange={(e) => handleChange('currency', e.target.value)}
                    className="currency-select"
                  >
                    <optgroup label={language === 'ar' ? '🇸🇦 دول الخليج' : '🇸🇦 GCC Countries'}>
                      {currencies.filter(c => ['SAR', 'AED', 'KWD', 'BHD', 'OMR', 'QAR'].includes(c.code)).map(c => (
                        <option key={c.code} value={c.code}>
                          {c.code} - {language === 'ar' ? c.nameAr : c.name} ({c.symbol})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={language === 'ar' ? '🌏 العملات الآسيوية' : '🌏 Asian Currencies'}>
                      {currencies.filter(c => ['INR', 'PKR', 'BDT', 'LKR', 'NPR', 'PHP', 'MYR', 'IDR', 'SGD'].includes(c.code)).map(c => (
                        <option key={c.code} value={c.code}>
                          {c.code} - {language === 'ar' ? c.nameAr : c.name} ({c.symbol})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={language === 'ar' ? '🌍 الشرق الأوسط' : '🌍 Middle East'}>
                      {currencies.filter(c => ['EGP', 'JOD', 'LBP', 'IQD', 'YER'].includes(c.code)).map(c => (
                        <option key={c.code} value={c.code}>
                          {c.code} - {language === 'ar' ? c.nameAr : c.name} ({c.symbol})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={language === 'ar' ? '💵 عملات عالمية' : '💵 Major Currencies'}>
                      {currencies.filter(c => ['USD', 'EUR', 'GBP', 'CAD', 'AUD'].includes(c.code)).map(c => (
                        <option key={c.code} value={c.code}>
                          {c.code} - {language === 'ar' ? c.nameAr : c.name} ({c.symbol})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>
            </div>

            <div className="settings-actions">
              <button className="btn-secondary" onClick={() => navigate('/')}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>Save Settings</button>
            </div>
          </>
        )}

        {activeTab === 'printer' && (
          <>
            <div className="settings-section">
              <h2>Printer Configuration</h2>
              <div className="settings-grid">
                <div className="setting-item">
                  <label>Printer Name (leave empty for default)</label>
                  <input
                    type="text"
                    value={settings.printer_name || ''}
                    onChange={(e) => handleChange('printer_name', e.target.value)}
                    placeholder="Auto-detect USB printer"
                  />
                </div>
              </div>
            </div>

            <div className="settings-section">
              <h2>Available Printers</h2>
              {printers.length === 0 ? (
                <div className="empty-printers">
                  <p>No USB printers detected</p>
                  <p className="printer-hint">Connect a thermal printer and click Refresh</p>
                </div>
              ) : (
                <div className="printers-list">
                  {printers.map((printer, index) => (
                    <div key={index} className="printer-item">
                      <span className="printer-icon">🖨️</span>
                      <div className="printer-info">
                        <span className="printer-name">{printer.name}</span>
                        <span className="printer-details">
                          Vendor: {printer.vendorId} | Product: {printer.productId}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="printer-actions">
                <button className="btn-secondary" onClick={loadPrinters}>🔄 Refresh</button>
                <button className="btn-primary" onClick={handleTestPrinter}>🧪 Test Print</button>
              </div>
            </div>

            <div className="settings-actions">
              <button className="btn-secondary" onClick={() => navigate('/')}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>Save Settings</button>
            </div>
          </>
        )}

        {activeTab === 'language' && (
          <>
            <div className="settings-section">
              <h2>🌐 {t('settings.selectLanguage')}</h2>
              <p className="section-description">
                {language === 'ar' ? 'اختر لغة واجهة التطبيق' : 'Choose the application interface language'}
              </p>
              <div className="language-options">
                {availableLanguages.map((lang) => (
                  <button
                    key={lang.code}
                    className={`language-btn ${language === lang.code ? 'active' : ''}`}
                    onClick={() => {
                      setLanguage(lang.code);
                      alert(lang.code === 'ar' ? 'تم تغيير اللغة بنجاح!' : 'Language changed successfully!');
                    }}
                  >
                    <span className="lang-flag">{lang.code === 'en' ? '🇺🇸' : '🇸🇦'}</span>
                    <span className="lang-name">{lang.nativeName}</span>
                    <span className="lang-english">({lang.name})</span>
                    {language === lang.code && <span className="lang-check">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="language-info-box">
              <h3>ℹ️ {language === 'ar' ? 'ملاحظة' : 'Note'}</h3>
              <p>
                {language === 'ar' 
                  ? 'سيتم تطبيق تغيير اللغة على جميع شاشات التطبيق فوراً.'
                  : 'Language change will be applied to all application screens immediately.'
                }
              </p>
            </div>
          </>
        )}

        {activeTab === 'template' && (
          <>
            <div className="settings-section">
              <h2>🧾 {language === 'ar' ? 'قالب الفاتورة' : 'Bill Template'}</h2>
              <p className="section-description">
                {language === 'ar' 
                  ? 'اختر تصميم الفاتورة المناسب لمطعمك. كل قالب له تخطيط وأسلوب مختلف.'
                  : 'Choose a bill design that suits your restaurant. Each template has a different layout and style.'
                }
              </p>
              <div className="template-grid">
                {getAllTemplates().map((template) => (
                  <div 
                    key={template.id}
                    className={`template-card ${settings.bill_template === template.id ? 'selected' : ''}`}
                    onClick={() => handleChange('bill_template', template.id)}
                  >
                    <div className="template-header">
                      <h3>{language === 'ar' ? template.nameAr : template.name}</h3>
                      {settings.bill_template === template.id && (
                        <span className="template-check">✓</span>
                      )}
                    </div>
                    <p className="template-description">
                      {template.description}
                    </p>
                    <div className="template-preview">
                      <pre>{template.preview}</pre>
                    </div>
                    <div className="template-features">
                      {template.settings.showAddress && (
                        <span className="feature-tag">📍 {language === 'ar' ? 'العنوان' : 'Address'}</span>
                      )}
                      {template.settings.showTaxNumber && (
                        <span className="feature-tag">🏷️ {language === 'ar' ? 'الرقم الضريبي' : 'Tax #'}</span>
                      )}
                      {template.settings.showQRCode && (
                        <span className="feature-tag">📱 QR</span>
                      )}
                      {template.settings.isRTL && (
                        <span className="feature-tag">🔄 RTL</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="settings-section">
              <h2>⚙️ {language === 'ar' ? 'إعدادات إضافية' : 'Additional Settings'}</h2>
              <div className="settings-grid">
                <div className="setting-item">
                  <label>{language === 'ar' ? 'الرقم الضريبي' : 'Tax Number (VAT#)'}</label>
                  <input
                    type="text"
                    value={settings.tax_number || ''}
                    onChange={(e) => handleChange('tax_number', e.target.value)}
                    placeholder={language === 'ar' ? 'مثال: 123456789012345' : 'e.g., 123456789012345'}
                  />
                </div>
                <div className="setting-item">
                  <label>{language === 'ar' ? 'رسالة التذييل' : 'Footer Message'}</label>
                  <input
                    type="text"
                    value={settings.bill_footer || ''}
                    onChange={(e) => handleChange('bill_footer', e.target.value)}
                    placeholder={language === 'ar' ? 'شكراً لزيارتكم!' : 'Thank you for your visit!'}
                  />
                </div>
              </div>
            </div>

            <div className="settings-actions">
              <button className="btn-secondary" onClick={() => navigate('/')}>
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button className="btn-primary" onClick={handleSave}>
                {language === 'ar' ? 'حفظ الإعدادات' : 'Save Settings'}
              </button>
            </div>
          </>
        )}

        {activeTab === 'backup' && (
          <>
            <div className="settings-section">
              <h2>{t('settings.backup')}</h2>
              <p className="section-description">
                {language === 'ar' 
                  ? 'إنشاء نسخ احتياطية من قاعدة البيانات لحماية بياناتك.'
                  : 'Create backups of your database to protect your data. Backups are stored locally and include all orders, items, and settings.'
                }
              </p>
              <div className="backup-actions">
                <button className="btn-primary btn-large" onClick={handleCreateBackup}>
                  💾 {t('settings.createBackup')}
                </button>
              </div>
            </div>

            <div className="settings-section">
              <h2>{t('settings.backupList')}</h2>
              {backups.length === 0 ? (
                <div className="empty-backups">
                  <p>{t('settings.noBackups')}</p>
                  <p className="backup-hint">{language === 'ar' ? 'أنشئ أول نسخة احتياطية أعلاه' : 'Create your first backup above'}</p>
                </div>
              ) : (
                <div className="backups-list">
                  {backups.map((backup, index) => (
                    <div key={index} className="backup-item">
                      <div className="backup-info">
                        <span className="backup-name">📦 {backup.name}</span>
                        <span className="backup-details">
                          {formatDate(backup.created)} • {formatFileSize(backup.size)}
                        </span>
                      </div>
                      <button 
                        className="btn-restore"
                        onClick={() => handleRestoreBackup(backup.path)}
                      >
                        ↩️ {t('settings.restoreBackup')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="backup-info-box">
              <h3>ℹ️ {language === 'ar' ? 'النسخ الاحتياطي التلقائي' : 'Automatic Backups'}</h3>
              <p>{language === 'ar' 
                ? 'يقوم النظام بإنشاء نسخ احتياطية يومية تلقائياً في الساعة 2:00 صباحاً. يتم الاحتفاظ بآخر 10 نسخ.'
                : 'The system automatically creates daily backups at 2:00 AM. The last 10 backups are kept.'
              }</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Settings;
