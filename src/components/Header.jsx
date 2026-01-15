import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import './Header.css';

function Header({ 
  title = 'Front Office', 
  showBackButton = false, 
  onBack,
  orderNumber = null,
  userLabel = null,
  onPrint = null,
  onRefresh = null,
}) {
  const navigate = useNavigate();
  const { t, language, isRTL } = useLanguage();
  const { user, logout } = useAuth();
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const operator = user?.full_name || user?.username || 'Guest';
  const displayUserLabel = userLabel || t('header.operator');

  useEffect(() => {
    // Update time every second
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDateTime = (date) => {
    // Use locale-aware formatting
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    };
    const locale = language === 'ar' ? 'ar-SA' : 'en-US';
    return date.toLocaleString(locale, options);
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      window.location.reload();
    }
  };

  const handleSettings = () => {
    navigate('/settings');
  };

  const handleLogout = async () => {
    const confirmMsg = language === 'ar' 
      ? 'هل أنت متأكد من تسجيل الخروج؟'
      : 'Are you sure you want to logout?';
    
    if (window.confirm(confirmMsg)) {
      await logout();
      // AuthContext will set isAuthenticated to false, showing login screen
    }
  };

  return (
    <header className="pos-header" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="header-left">
        <div className="operator-info">
          <span className="operator-label">{displayUserLabel}:</span>
          <span className="operator-name">{operator}</span>
          {orderNumber && (
            <>
              <span className="operator-separator">|</span>
              <span className="operator-label">OD:</span>
              <span className="operator-name">{orderNumber}</span>
            </>
          )}
        </div>
        <div className="datetime">{formatDateTime(currentDateTime)}</div>
      </div>
      
      <div className="header-center">
        <h1 className="header-title">{title}</h1>
      </div>
      
      <div className="header-right">
        <div className="header-icons">
          <button className="icon-btn" title="Print" onClick={handlePrint}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
          </button>
          <button className="icon-btn" title="Refresh" onClick={handleRefresh}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </button>
          <button className="icon-btn" title="Settings" onClick={handleSettings}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
            </svg>
          </button>
          <button className="icon-btn" title="Logout" onClick={handleLogout}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
        {showBackButton && (
          <button className="back-btn" onClick={onBack}>
            {isRTL ? '→' : '←'} {t('common.back')}
          </button>
        )}
      </div>
    </header>
  );
}

export default Header;
