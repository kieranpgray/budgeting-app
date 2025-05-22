import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import EnhancedDashboard from './components/EnhancedDashboard';
import WealthTracker from './components/WealthTracker';
import RequestPasswordReset from './components/RequestPasswordReset';
import IncomeManagement from './components/IncomeManagement';
import DataIOManagement from './components/DataIOManagement';
import BudgetManagement from './components/BudgetManagement';
import NetWorthManagement from './components/NetWorthManagement';
import FinancialGoalManagement from './components/FinancialGoalManagement';
import TransactionCategorization from './components/TransactionCategorization';
import Onboarding from './components/Onboarding';
import NotificationBell from './components/NotificationBell';
import './styles/theme.css';

function App() {
  const ProtectedRoute = ({ children }) => {
    // Check if user is authenticated using the AuthContext
    const token = sessionStorage.getItem('token');
    if (!token) {
      return <Navigate to="/login" />;
    }
    return children;
  };

  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/request-password-reset" element={<RequestPasswordReset />} />
            <Route path="/onboarding" element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <EnhancedDashboard />
              </ProtectedRoute>
            } />
            <Route path="/wealth-tracker" element={
              <ProtectedRoute>
                <WealthTracker />
              </ProtectedRoute>
            } />
            <Route path="/income" element={
              <ProtectedRoute>
                <IncomeManagement />
              </ProtectedRoute>
            } />
            <Route path="/data-io" element={
              <ProtectedRoute>
                <DataIOManagement />
              </ProtectedRoute>
            } />
            <Route path="/budgets" element={
              <ProtectedRoute>
                <BudgetManagement />
              </ProtectedRoute>
            } />
            <Route path="/net-worth" element={
              <ProtectedRoute>
                <NetWorthManagement />
              </ProtectedRoute>
            } />
            <Route path="/goals" element={
              <ProtectedRoute>
                <FinancialGoalManagement />
              </ProtectedRoute>
            } />
            <Route path="/categories" element={
              <ProtectedRoute>
                <TransactionCategorization />
              </ProtectedRoute>
            } />
            <Route path="/" element={
              sessionStorage.getItem('token') 
                ? <Navigate to="/dashboard" /> 
                : <Navigate to="/login" />
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
