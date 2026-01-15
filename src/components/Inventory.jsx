import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import Header from './Header';
import './Inventory.css';

function Inventory() {
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();
  const { user } = useAuth();
  
  const [items, setItems] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showLowStock, setShowLowStock] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [stockHistory, setStockHistory] = useState([]);
  const [formData, setFormData] = useState({
    quantity: 0,
    movement_type: 'purchase',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      if (window.electronAPI) {
        const [inventoryResult, lowStockResult, categoriesResult] = await Promise.all([
          window.electronAPI.getInventory(),
          window.electronAPI.getLowStockItems(),
          window.electronAPI.getCategories(),
        ]);
        
        if (inventoryResult.success) {
          setItems(inventoryResult.data);
        }
        if (lowStockResult.success) {
          setLowStockItems(lowStockResult.data);
        }
        if (categoriesResult.success) {
          setCategories(categoriesResult.data);
        }
      }
    } catch (err) {
      console.error('Error loading inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.code && item.code.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || item.category_id === parseInt(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  const handleOpenModal = (item, type = 'add') => {
    setSelectedItem(item);
    setFormData({
      quantity: type === 'set' ? item.stock_quantity : 0,
      movement_type: type === 'set' ? 'adjustment' : 'purchase',
      notes: '',
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedItem(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedItem || formData.quantity <= 0) return;
    
    try {
      if (window.electronAPI) {
        let result;
        
        if (formData.movement_type === 'adjustment') {
          result = await window.electronAPI.setStock(
            selectedItem.id,
            formData.quantity,
            formData.notes || null
          );
        } else {
          result = await window.electronAPI.updateStock(
            selectedItem.id,
            formData.quantity,
            formData.movement_type,
            formData.notes || null
          );
        }
        
        if (result.success) {
          handleCloseModal();
          loadData();
        } else {
          alert(result.error);
        }
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleViewHistory = async (item) => {
    setSelectedItem(item);
    setStockHistory([]);
    setShowHistoryModal(true);
    
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.getStockHistory(item.id, 50);
        if (result.success) {
          setStockHistory(result.data);
        }
      }
    } catch (err) {
      console.error('Error loading history:', err);
    }
  };

  const handleQuickAdjust = async (item, delta) => {
    try {
      if (window.electronAPI) {
        const type = delta > 0 ? 'purchase' : 'sale';
        const result = await window.electronAPI.updateStock(
          item.id,
          Math.abs(delta),
          type,
          `Quick adjustment: ${delta > 0 ? '+' : ''}${delta}`
        );
        
        if (result.success) {
          loadData();
        }
      }
    } catch (err) {
      console.error('Error adjusting stock:', err);
    }
  };

  const getStockStatus = (item) => {
    if (item.stock_quantity === 0) return 'out-of-stock';
    if (item.stock_quantity <= item.low_stock_threshold) return 'low-stock';
    return 'in-stock';
  };

  const getStockStatusLabel = (status) => {
    const labels = {
      'out-of-stock': language === 'ar' ? 'نفذ المخزون' : 'Out of Stock',
      'low-stock': language === 'ar' ? 'مخزون منخفض' : 'Low Stock',
      'in-stock': language === 'ar' ? 'متوفر' : 'In Stock',
    };
    return labels[status] || status;
  };

  const getMovementTypeLabel = (type) => {
    const labels = {
      purchase: language === 'ar' ? 'شراء' : 'Purchase',
      sale: language === 'ar' ? 'بيع' : 'Sale',
      adjustment: language === 'ar' ? 'تعديل' : 'Adjustment',
      waste: language === 'ar' ? 'هدر' : 'Waste',
    };
    return labels[type] || type;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString(language);
  };

  return (
    <div className="inventory-screen" dir={isRTL ? 'rtl' : 'ltr'}>
      <Header 
        title={language === 'ar' ? 'إدارة المخزون' : 'Inventory Management'} 
        showBackButton={true} 
        onBack={() => navigate('/')}
        onRefresh={loadData}
      />

      <div className="inventory-content">
        {/* Low Stock Alerts */}
        {showLowStock && lowStockItems.length > 0 && (
          <div className="low-stock-alerts">
            <div className="alert-header">
              <span className="alert-icon">⚠️</span>
              <h3>
                {language === 'ar' 
                  ? `تنبيهات المخزون المنخفض (${lowStockItems.length})`
                  : `Low Stock Alerts (${lowStockItems.length})`
                }
              </h3>
              <button 
                className="btn-hide"
                onClick={() => setShowLowStock(false)}
              >
                {language === 'ar' ? 'إخفاء' : 'Hide'}
              </button>
            </div>
            <div className="alert-items">
              {lowStockItems.map(item => (
                <div key={item.id} className="alert-item">
                  <span className="item-name">{item.name}</span>
                  <span className="item-stock">
                    {item.stock_quantity} / {item.low_stock_threshold}
                  </span>
                  <button 
                    className="btn-add-stock"
                    onClick={() => handleOpenModal(item)}
                  >
                    ➕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="inventory-filters">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder={language === 'ar' ? 'البحث عن صنف...' : 'Search items...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <select 
            className="category-filter"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
          >
            <option value="all">{language === 'ar' ? 'جميع الأصناف' : 'All Categories'}</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <button className="btn-refresh" onClick={loadData}>
            🔄 {language === 'ar' ? 'تحديث' : 'Refresh'}
          </button>
        </div>

        {/* Inventory Summary */}
        <div className="inventory-summary">
          <div className="summary-card">
            <span className="summary-icon">📦</span>
            <div className="summary-info">
              <span className="summary-value">{items.length}</span>
              <span className="summary-label">{language === 'ar' ? 'إجمالي الأصناف' : 'Total Items'}</span>
            </div>
          </div>
          <div className="summary-card warning">
            <span className="summary-icon">⚠️</span>
            <div className="summary-info">
              <span className="summary-value">{lowStockItems.length}</span>
              <span className="summary-label">{language === 'ar' ? 'مخزون منخفض' : 'Low Stock'}</span>
            </div>
          </div>
          <div className="summary-card danger">
            <span className="summary-icon">🚫</span>
            <div className="summary-info">
              <span className="summary-value">{items.filter(i => i.stock_quantity === 0).length}</span>
              <span className="summary-label">{language === 'ar' ? 'نفذ المخزون' : 'Out of Stock'}</span>
            </div>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="inventory-table-container">
          {loading ? (
            <div className="loading">Loading...</div>
          ) : (
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>{language === 'ar' ? 'الصنف' : 'Item'}</th>
                  <th>{language === 'ar' ? 'الفئة' : 'Category'}</th>
                  <th>{language === 'ar' ? 'المخزون' : 'Stock'}</th>
                  <th>{language === 'ar' ? 'الحد الأدنى' : 'Threshold'}</th>
                  <th>{language === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th>{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="no-data">
                      {language === 'ar' ? 'لا توجد أصناف' : 'No items found'}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map(item => {
                    const status = getStockStatus(item);
                    return (
                      <tr key={item.id} className={status}>
                        <td>
                          <div className="item-info">
                            <span className="item-name">{item.name}</span>
                            {item.code && <span className="item-code">{item.code}</span>}
                          </div>
                        </td>
                        <td>{item.category_name}</td>
                        <td>
                          <div className="stock-controls">
                            <button 
                              className="qty-btn"
                              onClick={() => handleQuickAdjust(item, -1)}
                              disabled={item.stock_quantity <= 0}
                            >
                              -
                            </button>
                            <span className="stock-qty">{item.stock_quantity}</span>
                            <button 
                              className="qty-btn"
                              onClick={() => handleQuickAdjust(item, 1)}
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td>{item.low_stock_threshold}</td>
                        <td>
                          <span className={`status-badge status-${status}`}>
                            {getStockStatusLabel(status)}
                          </span>
                        </td>
                        <td className="actions">
                          <button 
                            className="btn-action btn-add"
                            onClick={() => handleOpenModal(item)}
                            title={language === 'ar' ? 'إضافة مخزون' : 'Add Stock'}
                          >
                            ➕
                          </button>
                          <button 
                            className="btn-action btn-set"
                            onClick={() => handleOpenModal(item, 'set')}
                            title={language === 'ar' ? 'تعيين المخزون' : 'Set Stock'}
                          >
                            ✏️
                          </button>
                          <button 
                            className="btn-action btn-history"
                            onClick={() => handleViewHistory(item)}
                            title={language === 'ar' ? 'عرض السجل' : 'View History'}
                          >
                            📋
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {showModal && selectedItem && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {formData.movement_type === 'adjustment'
                  ? (language === 'ar' ? 'تعيين المخزون' : 'Set Stock')
                  : (language === 'ar' ? 'تعديل المخزون' : 'Adjust Stock')
                }
              </h2>
              <button className="modal-close" onClick={handleCloseModal}>✕</button>
            </div>

            <div className="modal-item-info">
              <span className="modal-item-name">{selectedItem.name}</span>
              <span className="modal-current-stock">
                {language === 'ar' ? 'المخزون الحالي:' : 'Current Stock:'} {selectedItem.stock_quantity}
              </span>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>{language === 'ar' ? 'نوع العملية' : 'Operation Type'}</label>
                <select
                  value={formData.movement_type}
                  onChange={e => setFormData(prev => ({ ...prev, movement_type: e.target.value }))}
                >
                  <option value="purchase">{language === 'ar' ? 'شراء (إضافة)' : 'Purchase (Add)'}</option>
                  <option value="sale">{language === 'ar' ? 'بيع (خصم)' : 'Sale (Subtract)'}</option>
                  <option value="adjustment">{language === 'ar' ? 'تعيين مباشر' : 'Set Directly'}</option>
                  <option value="waste">{language === 'ar' ? 'هدر (خصم)' : 'Waste (Subtract)'}</option>
                </select>
              </div>

              <div className="form-group">
                <label>
                  {formData.movement_type === 'adjustment' 
                    ? (language === 'ar' ? 'الكمية الجديدة' : 'New Quantity')
                    : (language === 'ar' ? 'الكمية' : 'Quantity')
                  }
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={e => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                />
              </div>

              <div className="form-group">
                <label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder={language === 'ar' ? 'ملاحظات اختيارية...' : 'Optional notes...'}
                  rows="3"
                />
              </div>

              {formData.movement_type !== 'adjustment' && (
                <div className="preview-change">
                  <span>{language === 'ar' ? 'المخزون بعد التعديل:' : 'Stock after change:'}</span>
                  <span className="preview-value">
                    {formData.movement_type === 'purchase' || formData.movement_type === 'adjustment'
                      ? selectedItem.stock_quantity + formData.quantity
                      : Math.max(0, selectedItem.stock_quantity - formData.quantity)
                    }
                  </span>
                </div>
              )}

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={handleCloseModal}>
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn-primary">
                  {language === 'ar' ? 'حفظ' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{language === 'ar' ? 'سجل حركة المخزون' : 'Stock Movement History'}</h2>
              <button className="modal-close" onClick={() => setShowHistoryModal(false)}>✕</button>
            </div>

            <div className="modal-item-info">
              <span className="modal-item-name">{selectedItem.name}</span>
            </div>

            <div className="history-table-container">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                    <th>{language === 'ar' ? 'النوع' : 'Type'}</th>
                    <th>{language === 'ar' ? 'الكمية' : 'Qty'}</th>
                    <th>{language === 'ar' ? 'قبل' : 'Before'}</th>
                    <th>{language === 'ar' ? 'بعد' : 'After'}</th>
                    <th>{language === 'ar' ? 'المستخدم' : 'User'}</th>
                    <th>{language === 'ar' ? 'ملاحظات' : 'Notes'}</th>
                  </tr>
                </thead>
                <tbody>
                  {stockHistory.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="no-data">
                        {language === 'ar' ? 'لا يوجد سجل' : 'No history found'}
                      </td>
                    </tr>
                  ) : (
                    stockHistory.map(record => (
                      <tr key={record.id}>
                        <td>{formatDate(record.created_at)}</td>
                        <td>
                          <span className={`movement-type type-${record.movement_type}`}>
                            {getMovementTypeLabel(record.movement_type)}
                          </span>
                        </td>
                        <td className={record.movement_type === 'purchase' || record.movement_type === 'adjustment' ? 'positive' : 'negative'}>
                          {record.movement_type === 'purchase' ? '+' : record.movement_type === 'adjustment' ? '=' : '-'}
                          {record.quantity}
                        </td>
                        <td>{record.previous_stock}</td>
                        <td>{record.new_stock}</td>
                        <td>{record.user_name || '-'}</td>
                        <td className="notes-cell">{record.notes || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowHistoryModal(false)}>
                {language === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Inventory;
