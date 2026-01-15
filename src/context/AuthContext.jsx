import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

// Role permissions configuration
const rolePermissions = {
  admin: {
    canAccessPOS: true,
    canViewReports: true,
    canManageItems: true,
    canManageUsers: true,
    canAccessSettings: true,
    canManageInventory: true,
    canDeleteOrders: true,
    canAccessWorkPeriod: true,
    canAccessKOT: true,
  },
  manager: {
    canAccessPOS: true,
    canViewReports: true,
    canManageItems: true,
    canManageUsers: false,
    canAccessSettings: false,
    canManageInventory: true,
    canDeleteOrders: true,
    canAccessWorkPeriod: true,
    canAccessKOT: true,
  },
  cashier: {
    canAccessPOS: true,
    canViewReports: false,
    canManageItems: false,
    canManageUsers: false,
    canAccessSettings: false,
    canManageInventory: false,
    canDeleteOrders: false,
    canAccessWorkPeriod: false,
    canAccessKOT: true,
  },
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.getCurrentUser();
        if (result.success && result.data) {
          setUser(result.data);
          setIsAuthenticated(true);
        }
      }
    } catch (error) {
      console.error('Session check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.login(username, password);
        if (result.success) {
          setUser(result.data);
          setIsAuthenticated(true);
          return { success: true, data: result.data };
        }
        return { success: false, error: result.error };
      }
      return { success: false, error: 'Electron API not available' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.logout();
      }
      setUser(null);
      setIsAuthenticated(false);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Check if current user has a specific permission
  const hasPermission = (permission) => {
    if (!user || !user.role) return false;
    const permissions = rolePermissions[user.role];
    return permissions ? permissions[permission] === true : false;
  };

  // Check if current user has a specific role
  const hasRole = (roles) => {
    if (!user || !user.role) return false;
    if (Array.isArray(roles)) {
      return roles.includes(user.role);
    }
    return user.role === roles;
  };

  // Get all permissions for current user
  const getPermissions = () => {
    if (!user || !user.role) return {};
    return rolePermissions[user.role] || {};
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    hasPermission,
    hasRole,
    getPermissions,
    rolePermissions,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
