import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import Header from './Header';
import './UserManagement.css';

function UserManagement() {
  const navigate = useNavigate();
  const { t, language, isRTL } = useLanguage();
  const { user: currentUser, rolePermissions } = useAuth();
  
  const [users, setUsers] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [activeTab, setActiveTab] = useState('users');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'cashier',
    is_active: true,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
    loadActivityLog();
  }, []);

  const loadUsers = async () => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.getUsers();
        if (result.success) {
          setUsers(result.data);
        }
      }
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadActivityLog = async () => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.getUserActivityLog(null, 100);
        if (result.success) {
          setActivityLog(result.data);
        }
      }
    } catch (err) {
      console.error('Error loading activity log:', err);
    }
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        password: '', // Don't show existing password
        full_name: user.full_name,
        role: user.role,
        is_active: user.is_active === 1,
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        password: '',
        full_name: '',
        role: 'cashier',
        is_active: true,
      });
    }
    setError('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setError('');
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.username.trim() || !formData.full_name.trim()) {
      setError(language === 'ar' ? 'الرجاء ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    if (!editingUser && !formData.password.trim()) {
      setError(language === 'ar' ? 'كلمة المرور مطلوبة للمستخدمين الجدد' : 'Password is required for new users');
      return;
    }

    try {
      if (window.electronAPI) {
        const userData = {
          username: formData.username,
          full_name: formData.full_name,
          role: formData.role,
          is_active: formData.is_active ? 1 : 0,
        };

        // Only include password if provided
        if (formData.password.trim()) {
          userData.password = formData.password;
        }

        let result;
        if (editingUser) {
          result = await window.electronAPI.updateUser(editingUser.id, userData);
        } else {
          result = await window.electronAPI.createUser(userData);
        }

        if (result.success) {
          handleCloseModal();
          loadUsers();
          loadActivityLog();
        } else {
          setError(result.error);
        }
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    const confirmMsg = language === 'ar' 
      ? 'هل أنت متأكد من حذف هذا المستخدم؟'
      : 'Are you sure you want to delete this user?';
    
    if (!window.confirm(confirmMsg)) return;

    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.deleteUser(userId);
        if (result.success) {
          loadUsers();
          loadActivityLog();
        } else {
          alert(result.error);
        }
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin': return 'badge-admin';
      case 'manager': return 'badge-manager';
      case 'cashier': return 'badge-cashier';
      default: return '';
    }
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin: language === 'ar' ? 'مدير النظام' : 'Admin',
      manager: language === 'ar' ? 'مدير' : 'Manager',
      cashier: language === 'ar' ? 'كاشير' : 'Cashier',
    };
    return labels[role] || role;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString(language);
  };

  const getActionLabel = (action) => {
    const labels = {
      login: language === 'ar' ? 'تسجيل دخول' : 'Login',
      logout: language === 'ar' ? 'تسجيل خروج' : 'Logout',
      create_user: language === 'ar' ? 'إنشاء مستخدم' : 'Create User',
      update_user: language === 'ar' ? 'تعديل مستخدم' : 'Update User',
      delete_user: language === 'ar' ? 'حذف مستخدم' : 'Delete User',
    };
    return labels[action] || action;
  };

  return (
    <div className="user-management" dir={isRTL ? 'rtl' : 'ltr'}>
      <Header 
        title={language === 'ar' ? 'إدارة المستخدمين' : 'User Management'} 
        showBackButton={true} 
        onBack={() => navigate('/')} 
      />

      <div className="user-management-content">
        <div className="tabs">
          <button 
            className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 {language === 'ar' ? 'المستخدمون' : 'Users'}
          </button>
          <button 
            className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            📋 {language === 'ar' ? 'سجل النشاط' : 'Activity Log'}
          </button>
          <button 
            className={`tab-btn ${activeTab === 'permissions' ? 'active' : ''}`}
            onClick={() => setActiveTab('permissions')}
          >
            🔐 {language === 'ar' ? 'الصلاحيات' : 'Permissions'}
          </button>
        </div>

        {activeTab === 'users' && (
          <div className="users-section">
            <div className="section-header">
              <h2>{language === 'ar' ? 'المستخدمون' : 'Users'}</h2>
              <button className="btn-primary" onClick={() => handleOpenModal()}>
                ➕ {language === 'ar' ? 'إضافة مستخدم' : 'Add User'}
              </button>
            </div>

            {loading ? (
              <div className="loading">Loading...</div>
            ) : (
              <div className="users-table-container">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>{language === 'ar' ? 'اسم المستخدم' : 'Username'}</th>
                      <th>{language === 'ar' ? 'الاسم الكامل' : 'Full Name'}</th>
                      <th>{language === 'ar' ? 'الدور' : 'Role'}</th>
                      <th>{language === 'ar' ? 'الحالة' : 'Status'}</th>
                      <th>{language === 'ar' ? 'آخر دخول' : 'Last Login'}</th>
                      <th>{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id} className={user.is_active ? '' : 'inactive'}>
                        <td>
                          <span className="username">{user.username}</span>
                          {user.id === currentUser?.id && (
                            <span className="current-user-badge">
                              {language === 'ar' ? 'أنت' : 'You'}
                            </span>
                          )}
                        </td>
                        <td>{user.full_name}</td>
                        <td>
                          <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                            {getRoleLabel(user.role)}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                            {user.is_active 
                              ? (language === 'ar' ? 'نشط' : 'Active')
                              : (language === 'ar' ? 'غير نشط' : 'Inactive')
                            }
                          </span>
                        </td>
                        <td>{formatDate(user.last_login)}</td>
                        <td className="actions">
                          <button 
                            className="btn-edit"
                            onClick={() => handleOpenModal(user)}
                            title={language === 'ar' ? 'تعديل' : 'Edit'}
                          >
                            ✏️
                          </button>
                          {user.id !== currentUser?.id && (
                            <button 
                              className="btn-delete"
                              onClick={() => handleDeleteUser(user.id)}
                              title={language === 'ar' ? 'حذف' : 'Delete'}
                            >
                              🗑️
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="activity-section">
            <div className="section-header">
              <h2>{language === 'ar' ? 'سجل النشاط' : 'Activity Log'}</h2>
              <button className="btn-secondary" onClick={loadActivityLog}>
                🔄 {language === 'ar' ? 'تحديث' : 'Refresh'}
              </button>
            </div>

            <div className="activity-table-container">
              <table className="activity-table">
                <thead>
                  <tr>
                    <th>{language === 'ar' ? 'المستخدم' : 'User'}</th>
                    <th>{language === 'ar' ? 'الإجراء' : 'Action'}</th>
                    <th>{language === 'ar' ? 'التفاصيل' : 'Details'}</th>
                    <th>{language === 'ar' ? 'الوقت' : 'Time'}</th>
                  </tr>
                </thead>
                <tbody>
                  {activityLog.map(log => (
                    <tr key={log.id}>
                      <td>{log.full_name} ({log.username})</td>
                      <td>
                        <span className={`action-badge action-${log.action}`}>
                          {getActionLabel(log.action)}
                        </span>
                      </td>
                      <td>{log.details || '-'}</td>
                      <td>{formatDate(log.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'permissions' && (
          <div className="permissions-section">
            <div className="section-header">
              <h2>{language === 'ar' ? 'صلاحيات الأدوار' : 'Role Permissions'}</h2>
            </div>

            <div className="permissions-grid">
              {Object.entries(rolePermissions).map(([role, permissions]) => (
                <div key={role} className="permission-card">
                  <h3 className={`role-title ${getRoleBadgeClass(role)}`}>
                    {getRoleLabel(role)}
                  </h3>
                  <ul className="permissions-list">
                    {Object.entries(permissions).map(([perm, hasAccess]) => (
                      <li key={perm} className={hasAccess ? 'has-access' : 'no-access'}>
                        <span className="perm-icon">{hasAccess ? '✅' : '❌'}</span>
                        <span className="perm-name">{getPermissionLabel(perm, language)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* User Form Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {editingUser 
                  ? (language === 'ar' ? 'تعديل المستخدم' : 'Edit User')
                  : (language === 'ar' ? 'إضافة مستخدم جديد' : 'Add New User')
                }
              </h2>
              <button className="modal-close" onClick={handleCloseModal}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>{language === 'ar' ? 'اسم المستخدم' : 'Username'} *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={e => handleInputChange('username', e.target.value)}
                  placeholder={language === 'ar' ? 'أدخل اسم المستخدم' : 'Enter username'}
                />
              </div>

              <div className="form-group">
                <label>
                  {language === 'ar' ? 'كلمة المرور' : 'Password'}
                  {!editingUser && ' *'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={e => handleInputChange('password', e.target.value)}
                  placeholder={editingUser 
                    ? (language === 'ar' ? 'اترك فارغاً للإبقاء على كلمة المرور الحالية' : 'Leave empty to keep current password')
                    : (language === 'ar' ? 'أدخل كلمة المرور' : 'Enter password')
                  }
                />
              </div>

              <div className="form-group">
                <label>{language === 'ar' ? 'الاسم الكامل' : 'Full Name'} *</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={e => handleInputChange('full_name', e.target.value)}
                  placeholder={language === 'ar' ? 'أدخل الاسم الكامل' : 'Enter full name'}
                />
              </div>

              <div className="form-group">
                <label>{language === 'ar' ? 'الدور' : 'Role'} *</label>
                <select
                  value={formData.role}
                  onChange={e => handleInputChange('role', e.target.value)}
                >
                  <option value="admin">{getRoleLabel('admin')}</option>
                  <option value="manager">{getRoleLabel('manager')}</option>
                  <option value="cashier">{getRoleLabel('cashier')}</option>
                </select>
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={e => handleInputChange('is_active', e.target.checked)}
                  />
                  <span>{language === 'ar' ? 'حساب نشط' : 'Active Account'}</span>
                </label>
              </div>

              {error && <div className="form-error">{error}</div>}

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={handleCloseModal}>
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn-primary">
                  {editingUser 
                    ? (language === 'ar' ? 'حفظ التغييرات' : 'Save Changes')
                    : (language === 'ar' ? 'إضافة المستخدم' : 'Add User')
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to get permission labels
function getPermissionLabel(permission, language) {
  const labels = {
    canAccessPOS: language === 'ar' ? 'الوصول لنقطة البيع' : 'Access POS',
    canViewReports: language === 'ar' ? 'عرض التقارير' : 'View Reports',
    canManageItems: language === 'ar' ? 'إدارة الأصناف' : 'Manage Items',
    canManageUsers: language === 'ar' ? 'إدارة المستخدمين' : 'Manage Users',
    canAccessSettings: language === 'ar' ? 'الوصول للإعدادات' : 'Access Settings',
    canManageInventory: language === 'ar' ? 'إدارة المخزون' : 'Manage Inventory',
    canDeleteOrders: language === 'ar' ? 'حذف الطلبات' : 'Delete Orders',
    canAccessWorkPeriod: language === 'ar' ? 'إدارة فترة العمل' : 'Work Period',
    canAccessKOT: language === 'ar' ? 'عرض طلبات المطبخ' : 'KOT Display',
  };
  return labels[permission] || permission;
}

export default UserManagement;
