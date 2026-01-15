import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import Header from './Header';
import './FrontOffice.css';

function FrontOffice() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user, hasPermission, logout } = useAuth();

  // Define menu items with permission requirements
  const allMenuItems = [
    {
      id: 'dine-in',
      labelKey: 'frontOffice.dineIn',
      icon: '🍽️',
      route: '/order-entry',
      orderType: 'dine-in',
      permission: 'canAccessPOS',
    },
    {
      id: 'take-away',
      labelKey: 'frontOffice.takeAway',
      icon: '📦',
      route: '/order-entry',
      orderType: 'take-away',
      permission: 'canAccessPOS',
    },
    {
      id: 'delivery',
      labelKey: 'frontOffice.delivery',
      icon: '🚚',
      route: '/order-entry',
      orderType: 'home-delivery',
      permission: 'canAccessPOS',
    },
    {
      id: 'express-bill',
      labelKey: 'frontOffice.expressBill',
      icon: '⚡',
      route: '/order-entry',
      orderType: 'express-billing',
      permission: 'canAccessPOS',
    },
    {
      id: 'work-period',
      labelKey: 'frontOffice.workPeriod',
      icon: '⏰',
      route: '/work-period',
      permission: 'canAccessWorkPeriod',
    },
    {
      id: 'kot-display',
      labelKey: 'frontOffice.kotDisplay',
      icon: '📺',
      route: '/kot-display',
      permission: 'canAccessKOT',
    },
    {
      id: 'reports',
      labelKey: 'frontOffice.reports',
      icon: '📊',
      route: '/reports',
      permission: 'canViewReports',
    },
    {
      id: 'items',
      labelKey: 'frontOffice.items',
      icon: '📋',
      route: '/items',
      permission: 'canManageItems',
    },
    {
      id: 'inventory',
      label: language === 'ar' ? 'المخزون' : 'Inventory',
      icon: '📦',
      route: '/inventory',
      permission: 'canManageInventory',
    },
    {
      id: 'users',
      label: language === 'ar' ? 'المستخدمون' : 'Users',
      icon: '👥',
      route: '/users',
      permission: 'canManageUsers',
    },
    {
      id: 'settings',
      labelKey: 'common.settings',
      icon: '⚙️',
      route: '/settings',
      permission: 'canAccessSettings',
    },
    {
      id: 'tax-report',
      labelKey: 'frontOffice.taxReport',
      icon: '📈',
      route: '/tax-report',
      permission: 'canViewReports',
    },
    {
      id: 'logout',
      labelKey: 'common.logout',
      icon: '🚪',
      route: '/logout',
      permission: null, // Always visible
    },
  ];

  // Filter menu items based on user permissions
  const menuItems = allMenuItems.filter(item => {
    if (item.permission === null) return true;
    return hasPermission(item.permission);
  });

  const handleMenuClick = async (item) => {
    if (item.id === 'logout') {
      const confirmMsg = language === 'ar' 
        ? 'هل أنت متأكد من تسجيل الخروج؟'
        : 'Are you sure you want to logout?';
      
      if (window.confirm(confirmMsg)) {
        await logout();
        // No need to reload - React will re-render and show login screen
      }
      return;
    }

    if (item.route === '/order-entry') {
      navigate(item.route, { state: { orderType: item.orderType } });
    } else {
      navigate(item.route);
    }
  };

  const getLabel = (item) => {
    if (item.label) return item.label;
    return t(item.labelKey);
  };

  return (
    <div className="front-office">
      <Header title={t('frontOffice.title')} />
      
      {/* User Info Bar */}
      <div className="user-info-bar">
        <div className="user-welcome">
          <span className="welcome-icon">👤</span>
          <span className="welcome-text">
            {language === 'ar' ? 'مرحباً,' : 'Welcome,'} <strong>{user?.full_name}</strong>
          </span>
          <span className={`role-badge role-${user?.role}`}>
            {user?.role === 'admin' ? (language === 'ar' ? 'مدير النظام' : 'Admin') :
             user?.role === 'manager' ? (language === 'ar' ? 'مدير' : 'Manager') :
             (language === 'ar' ? 'كاشير' : 'Cashier')}
          </span>
        </div>
      </div>
      
      <div className="front-office-content">
        <div className="menu-grid">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`menu-item-btn ${item.id === 'logout' ? 'logout-btn' : ''}`}
              onClick={() => handleMenuClick(item)}
            >
              <div className="menu-item-icon">{item.icon}</div>
              <div className="menu-item-label">{getLabel(item)}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default FrontOffice;
