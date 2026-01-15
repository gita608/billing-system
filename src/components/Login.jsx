import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import './Login.css';

function Login() {
  const { language } = useLanguage();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username.trim() || !password.trim()) {
      setError(language === 'ar' ? 'الرجاء إدخال اسم المستخدم وكلمة المرور' : 'Please enter username and password');
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await login(username, password);
      
      if (!result.success) {
        setError(result.error || (language === 'ar' ? 'فشل تسجيل الدخول' : 'Login failed'));
      }
      // If successful, AuthContext will update isAuthenticated and App will re-render
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-container">
        <div className="login-header">
          <div className="login-logo">🍽️</div>
          <h1 className="login-title">Restaurant POS</h1>
          <p className="login-subtitle">
            {language === 'ar' ? 'نظام نقاط البيع' : 'Point of Sale System'}
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">
              {language === 'ar' ? 'اسم المستخدم' : 'Username'}
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={language === 'ar' ? 'أدخل اسم المستخدم' : 'Enter username'}
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              {language === 'ar' ? 'كلمة المرور' : 'Password'}
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={language === 'ar' ? 'أدخل كلمة المرور' : 'Enter password'}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="login-error">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="login-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="loading-spinner">⏳</span>
            ) : (
              <>
                <span className="btn-icon">🚀</span>
                {language === 'ar' ? 'تسجيل الدخول' : 'Login'}
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p className="login-hint">
            {language === 'ar' 
              ? 'المستخدم الافتراضي: admin / admin123'
              : 'Default: admin / admin123'
            }
          </p>
        </div>
      </div>

      <div className="login-background">
        <div className="bg-shape bg-shape-1"></div>
        <div className="bg-shape bg-shape-2"></div>
        <div className="bg-shape bg-shape-3"></div>
      </div>
    </div>
  );
}

export default Login;
