import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import FrontOffice from './components/FrontOffice';
import OrderEntry from './components/OrderEntry';
import WorkPeriod from './components/WorkPeriod';
import KOTDisplay from './components/KOTDisplay';
import Reports from './components/Reports';
import Items from './components/Items';
import Settings from './components/Settings';
import TaxReport from './components/TaxReport';
import Login from './components/Login';
import UserManagement from './components/UserManagement';
import Inventory from './components/Inventory';
import './App.css';

// Protected Route wrapper - checks if user is authenticated
function ProtectedRoute({ children, requiredPermission }) {
  const { isAuthenticated, loading, hasPermission } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner">⏳</div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check permission if required
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// App content with routes
function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner">⏳</div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<FrontOffice />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/order-entry" element={<OrderEntry />} />
        <Route 
          path="/work-period" 
          element={
            <ProtectedRoute requiredPermission="canAccessWorkPeriod">
              <WorkPeriod />
            </ProtectedRoute>
          } 
        />
        <Route path="/kot-display" element={<KOTDisplay />} />
        <Route 
          path="/reports" 
          element={
            <ProtectedRoute requiredPermission="canViewReports">
              <Reports />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/items" 
          element={
            <ProtectedRoute requiredPermission="canManageItems">
              <Items />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute requiredPermission="canAccessSettings">
              <Settings />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/tax-report" 
          element={
            <ProtectedRoute requiredPermission="canViewReports">
              <TaxReport />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/users" 
          element={
            <ProtectedRoute requiredPermission="canManageUsers">
              <UserManagement />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/inventory" 
          element={
            <ProtectedRoute requiredPermission="canManageInventory">
              <Inventory />
            </ProtectedRoute>
          } 
        />
        <Route path="/logout" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
