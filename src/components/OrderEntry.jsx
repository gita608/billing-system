import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import Header from './Header';
import './OrderEntry.css';

function OrderEntry() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [activeOrderType, setActiveOrderType] = useState(
    location.state?.orderType || 'dine-in'
  );
  const [orderNumber, setOrderNumber] = useState(null);
  const [billNo, setBillNo] = useState('');
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [contactNo, setContactNo] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [taxRate, setTaxRate] = useState(5);
  const [settings, setSettings] = useState({});

  useEffect(() => {
    loadSettings();
    loadCategories();
    loadMenuItems();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      loadMenuItems(selectedCategory);
    } else {
      loadMenuItems();
    }
  }, [selectedCategory]);

  const loadSettings = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.getSettings();
      if (result.success) {
        setSettings(result.data);
        setTaxRate(parseFloat(result.data.tax_rate || 5));
      }
    }
  };

  const loadCategories = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.getCategories();
      if (result.success) {
        setCategories(result.data);
      }
    }
  };

  const loadMenuItems = async (categoryId = null) => {
    if (window.electronAPI) {
      const result = await window.electronAPI.getMenuItems(categoryId);
      if (result.success) {
        setMenuItems(result.data);
      }
    }
  };

  const calculateTotals = () => {
    const subTotal = cartItems.reduce((sum, item) => sum + (item.rate * item.qty), 0);
    const vat = subTotal * (taxRate / 100);
    const total = subTotal + vat;
    return { subTotal, vat, total };
  };

  const { subTotal, vat, total } = calculateTotals();

  const handleCategoryClick = (category) => {
    if (selectedCategory === category.id) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(category.id);
    }
  };

  const handleAddMenuItem = (menuItem) => {
    const existingItem = cartItems.find(item => item.menu_item_id === menuItem.id);
    
    if (existingItem) {
      setCartItems(cartItems.map(item => 
        item.menu_item_id === menuItem.id 
          ? { ...item, qty: item.qty + 1 }
          : item
      ));
    } else {
      const newItem = {
        id: Date.now(),
        menu_item_id: menuItem.id,
        name: menuItem.name,
        rate: menuItem.price,
        qty: 1,
        notes: '',
      };
      setCartItems([...cartItems, newItem]);
    }
  };

  const handleQuantityChange = (itemId, change) => {
    setCartItems(cartItems.map(item => {
      if (item.id === itemId) {
        const newQty = Math.max(1, item.qty + change);
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const handleRemoveItem = (itemId) => {
    setCartItems(cartItems.filter(item => item.id !== itemId));
  };

  const handleNumberPad = (num) => {
    if (selectedItem) {
      setCartItems(cartItems.map(item => {
        if (item.id === selectedItem.id) {
          return { ...item, qty: parseInt(num) || 1 };
        }
        return item;
      }));
    } else {
      setSearchQuery(prev => prev + num);
    }
  };

  const handleNewBill = () => {
    setCartItems([]);
    setSelectedItem(null);
    setBillNo('');
    setOrderNumber(null);
    setCurrentOrderId(null);
    setCustomerName('');
    setContactNo('');
    setTableNumber('');
    setDeliveryAddress('');
  };

  const buildOrderNotes = () => {
    const notes = [];
    if (tableNumber) notes.push(`Table: ${tableNumber}`);
    if (deliveryAddress) notes.push(`Address: ${deliveryAddress}`);
    return notes.length > 0 ? notes.join(' | ') : null;
  };

  const handleSendOrder = async () => {
    if (cartItems.length === 0) {
      alert('Please add items to the order');
      return;
    }

    // Validation for specific order types
    if ((activeOrderType === 'dine-in' || activeOrderType === 'dine-in-billing') && !tableNumber) {
      alert('Please enter table number for Dine In orders');
      return;
    }
    if (activeOrderType === 'home-delivery' && !deliveryAddress) {
      alert('Please enter delivery address for Home Delivery orders');
      return;
    }

    if (window.electronAPI) {
      const orderData = {
        order_type: activeOrderType,
        customer_name: customerName || null,
        contact_no: contactNo || null,
        payment_mode: paymentMode,
        subtotal: subTotal,
        tax: vat,
        total: total,
        status: 'pending',
        notes: buildOrderNotes(),
        items: cartItems.map(item => ({
          menu_item_id: item.menu_item_id,
          item_name: item.name,
          quantity: item.qty,
          rate: item.rate,
          notes: item.notes || null,
        })),
      };

      const result = await window.electronAPI.createOrder(orderData);
      if (result.success) {
        setOrderNumber(result.order_number);
        setBillNo(result.bill_number);
        setCurrentOrderId(result.id);
        alert('Order sent successfully!');
      } else {
        alert('Error: ' + result.error);
      }
    }
  };

  const handleSettle = async () => {
    if (cartItems.length === 0) {
      alert('Please add items to the order');
      return;
    }

    // Validation for specific order types (skip for express billing)
    if (activeOrderType !== 'express-billing') {
      if ((activeOrderType === 'dine-in' || activeOrderType === 'dine-in-billing') && !tableNumber) {
        alert('Please enter table number for Dine In orders');
        return;
      }
      if (activeOrderType === 'home-delivery' && !deliveryAddress) {
        alert('Please enter delivery address for Home Delivery orders');
        return;
      }
    }

    if (window.electronAPI) {
      const orderData = {
        order_type: activeOrderType,
        customer_name: customerName || null,
        contact_no: contactNo || null,
        payment_mode: paymentMode,
        subtotal: subTotal,
        tax: vat,
        total: total,
        status: 'completed',
        notes: buildOrderNotes(),
        items: cartItems.map(item => ({
          menu_item_id: item.menu_item_id,
          item_name: item.name,
          quantity: item.qty,
          rate: item.rate,
          notes: item.notes || null,
        })),
      };

      const result = await window.electronAPI.createOrder(orderData);
      if (result.success) {
        setOrderNumber(result.order_number);
        setBillNo(result.bill_number);
        setCurrentOrderId(result.id);
        alert('Order settled successfully!');
        handleNewBill();
      } else {
        alert('Error: ' + result.error);
      }
    }
  };

  const handlePrint = async () => {
    if (cartItems.length === 0) {
      alert('No items to print');
      return;
    }

    // If order not saved yet, save it first
    let orderId = currentOrderId;
    if (!orderId) {
      if (window.electronAPI) {
        const orderData = {
          order_type: activeOrderType,
          customer_name: customerName || null,
          contact_no: contactNo || null,
          payment_mode: paymentMode,
          subtotal: subTotal,
          tax: vat,
          total: total,
          status: 'pending',
          notes: buildOrderNotes(),
          items: cartItems.map(item => ({
            menu_item_id: item.menu_item_id,
            item_name: item.name,
            quantity: item.qty,
            rate: item.rate,
            notes: item.notes || null,
          })),
        };

        const result = await window.electronAPI.createOrder(orderData);
        if (result.success) {
          orderId = result.id;
          setOrderNumber(result.order_number);
          setBillNo(result.bill_number);
          setCurrentOrderId(result.id);
        } else {
          alert('Error creating order: ' + result.error);
          return;
        }
      }
    }

    if (orderId && window.electronAPI) {
      const printResult = await window.electronAPI.printBill(orderId);
      if (printResult.success) {
        alert('Bill printed successfully!');
      } else {
        alert('Print error: ' + printResult.error);
      }
    } else {
      alert('Could not find order to print');
    }
  };

  const filteredMenuItems = menuItems.filter(item => 
    !searchQuery || 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.code && item.code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const orderTypes = [
    { id: 'dine-in', label: t('pos.dineIn'), icon: '🍽️', color: '#4a90d9' },
    { id: 'dine-in-billing', label: t('pos.dineInBilling'), icon: '🧾', color: '#6c5ce7' },
    { id: 'home-delivery', label: t('pos.homeDelivery'), icon: '🚚', color: '#e17055' },
    { id: 'take-away', label: t('pos.takeAway'), icon: '📦', color: '#00b894' },
    { id: 'express-billing', label: t('pos.expressBilling'), icon: '⚡', color: '#fdcb6e' },
  ];

  const getOrderTypeInfo = () => {
    return orderTypes.find(t => t.id === activeOrderType) || orderTypes[0];
  };

  return (
    <div className="order-entry">
      <Header 
        title="POS" 
        showBackButton={true} 
        onBack={() => navigate('/')}
        orderNumber={orderNumber}
        userLabel="POS User"
      />

      <div className="order-entry-content">
        {/* Order Type Tabs */}
        <div className="order-type-tabs">
          {orderTypes.map((type) => (
            <button
              key={type.id}
              className={`order-type-tab ${activeOrderType === type.id ? 'active' : ''}`}
              onClick={() => setActiveOrderType(type.id)}
              style={activeOrderType === type.id ? { backgroundColor: type.color, borderColor: type.color } : {}}
            >
              <span className="tab-icon">{type.icon}</span>
              <span className="tab-label">{type.label}</span>
            </button>
          ))}
        </div>

        <div className="order-entry-main">
          {/* Left Sidebar - Categories */}
          <div className="categories-sidebar">
            <div className="categories-header">
              <input
                type="text"
                className="search-input"
                placeholder={t('pos.searchItems')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="categories-list">
              <button
                className={`category-btn ${selectedCategory === null ? 'active' : ''}`}
                onClick={() => setSelectedCategory(null)}
              >
                📋 {t('pos.allItems')}
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
                  onClick={() => handleCategoryClick(category)}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* Center - Menu Items Grid */}
          <div className="menu-items-section">
            <div className="menu-items-grid">
              {filteredMenuItems.length === 0 ? (
                <div className="empty-menu">
                  <p>{t('pos.noItemsFound')}</p>
                </div>
              ) : (
                filteredMenuItems.map((item) => (
                  <button
                    key={item.id}
                    className={`menu-item-card ${item.is_available === 0 ? 'unavailable' : ''}`}
                    onClick={() => item.is_available === 1 && handleAddMenuItem(item)}
                    disabled={item.is_available === 0}
                  >
                    <div className="item-name">{item.name}</div>
                    <div className="item-price">{item.price?.toFixed(2)} {settings.currency || 'SAR'}</div>
                    {item.code && <div className="item-code">{item.code}</div>}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right Section - Bill Panel */}
          <div className="bill-panel">
            {/* Bill Header - Fixed */}
            <div className="bill-header">
              <div className="bill-info-row">
                <span className="order-type-badge" style={{ backgroundColor: getOrderTypeInfo().color }}>
                  {getOrderTypeInfo().icon} {getOrderTypeInfo().label}
                </span>
                <span className="bill-number">#{billNo || 'NEW'}</span>
              </div>
              
              {/* Conditional inputs */}
              {(activeOrderType === 'dine-in' || activeOrderType === 'dine-in-billing') && (
                <input
                  type="text"
                  placeholder={t('pos.tableNo')}
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="bill-input table-input"
                />
              )}
              {activeOrderType === 'home-delivery' && (
                <input
                  type="text"
                  placeholder={t('pos.deliveryAddress')}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="bill-input address-input"
                />
              )}
              {activeOrderType === 'express-billing' && (
                <div className="express-hint">⚡ {t('pos.quickMode')}</div>
              )}
            </div>

            {/* Cart Items - Scrollable */}
            <div className="cart-items">
              {cartItems.length === 0 ? (
                <div className="empty-cart">
                  <p>🛒 {t('pos.cartEmpty')}</p>
                  <small>{t('pos.clickToAdd')}</small>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div
                    key={item.id}
                    className={`cart-item ${selectedItem?.id === item.id ? 'selected' : ''}`}
                    onClick={() => setSelectedItem(item)}
                  >
                    <div className="cart-item-info">
                      <span className="cart-item-name">{item.name}</span>
                      <span className="cart-item-price">{item.rate.toFixed(2)} × {item.qty}</span>
                    </div>
                    <div className="cart-item-actions">
                      <button className="qty-btn qty-minus" onClick={(e) => { e.stopPropagation(); handleQuantityChange(item.id, -1); }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                      </button>
                      <span className="qty-display">{item.qty}</span>
                      <button className="qty-btn qty-plus" onClick={(e) => { e.stopPropagation(); handleQuantityChange(item.id, 1); }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                      </button>
                      <button className="remove-btn" onClick={(e) => { e.stopPropagation(); handleRemoveItem(item.id); }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                    <div className="cart-item-total">{(item.rate * item.qty).toFixed(2)}</div>
                  </div>
                ))
              )}
            </div>

            {/* Bill Footer - Fixed */}
            <div className="bill-footer">
              <div className="bill-totals">
                <div className="total-row">
                  <span>{t('pos.subtotal')}:</span>
                  <span>{subTotal.toFixed(2)}</span>
                </div>
                <div className="total-row">
                  <span>VAT ({taxRate}%):</span>
                  <span>{vat.toFixed(2)}</span>
                </div>
                <div className="total-row grand-total">
                  <span>{t('pos.total')}:</span>
                  <span>{total.toFixed(2)}</span>
                </div>
              </div>

              <div className="action-buttons">
                <button className="action-btn new-btn" onClick={handleNewBill}>{t('pos.newBill')}</button>
                <button className="action-btn send-btn" onClick={handleSendOrder}>{t('pos.sendOrder')}</button>
                <button className="action-btn settle-btn" onClick={handleSettle}>{t('pos.settle')}</button>
                <button className="action-btn print-btn" onClick={handlePrint}>{t('common.print')}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderEntry;
