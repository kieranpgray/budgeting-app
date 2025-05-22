import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Initialize auth state from secure cookie or sessionStorage (not localStorage)
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Try to get user info from token validation endpoint
        const token = sessionStorage.getItem('token');
        if (token) {
          const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
          const response = await axios.get(`${apiBaseUrl}/api/auth/validate-token`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.data && response.data.valid) {
            setCurrentUser(response.data.user);
          } else {
            // Token invalid, clear it
            sessionStorage.removeItem('token');
            setCurrentUser(null);
          }
        }
      } catch (error) {
        console.error('Auth validation error:', error);
        sessionStorage.removeItem('token');
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuthStatus();
  }, []);
  
  // Login function
  const login = async (email, password) => {
    setError('');
    try {
      const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      const response = await axios.post(`${apiBaseUrl}/api/auth/login`, { email, password });
      
      if (response.data.requires2FA) {
        // Return the temp token for 2FA verification
        return { requires2FA: true, tempToken: response.data.tempToken };
      } else {
        // Store token in sessionStorage (more secure than localStorage)
        sessionStorage.setItem('token', response.data.token);
        
        // Get user info
        const userResponse = await axios.get(`${apiBaseUrl}/api/auth/me`, {
          headers: { Authorization: `Bearer ${response.data.token}` }
        });
        
        setCurrentUser(userResponse.data);
        return { success: true };
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Login failed');
      throw error;
    }
  };
  
  // Verify 2FA
  const verify2FA = async (tempToken, totpCode) => {
    setError('');
    try {
      const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      const response = await axios.post(`${apiBaseUrl}/api/auth/2fa-verify`, { 
        tempToken, 
        totpCode 
      });
      
      // Store token in sessionStorage
      sessionStorage.setItem('token', response.data.token);
      
      // Get user info
      const userResponse = await axios.get(`${apiBaseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${response.data.token}` }
      });
      
      setCurrentUser(userResponse.data);
      return { success: true };
    } catch (error) {
      setError(error.response?.data?.message || '2FA verification failed');
      throw error;
    }
  };
  
  // Logout function
  const logout = async () => {
    try {
      // Call logout endpoint to invalidate token on server
      const token = sessionStorage.getItem('token');
      if (token) {
        const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
        await axios.post(`${apiBaseUrl}/api/auth/logout`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear token from storage
      sessionStorage.removeItem('token');
      setCurrentUser(null);
    }
  };
  
  // Register function
  const register = async (email, password) => {
    setError('');
    try {
      const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      const response = await axios.post(`${apiBaseUrl}/api/auth/register`, { email, password });
      return response.data;
    } catch (error) {
      setError(error.response?.data?.message || 'Registration failed');
      throw error;
    }
  };
  
  // Request password reset
  const requestPasswordReset = async (email) => {
    setError('');
    try {
      const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      const response = await axios.post(`${apiBaseUrl}/api/auth/request-password-reset`, { email });
      return response.data;
    } catch (error) {
      setError(error.response?.data?.message || 'Password reset request failed');
      throw error;
    }
  };
  
  // Reset password
  const resetPassword = async (token, password) => {
    setError('');
    try {
      const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      const response = await axios.post(`${apiBaseUrl}/api/auth/reset-password/${token}`, { password });
      return response.data;
    } catch (error) {
      setError(error.response?.data?.message || 'Password reset failed');
      throw error;
    }
  };
  
  // Get auth token
  const getAuthToken = () => {
    return sessionStorage.getItem('token');
  };
  
  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!sessionStorage.getItem('token');
  };
  
  const value = {
    currentUser,
    loading,
    error,
    login,
    logout,
    register,
    verify2FA,
    requestPasswordReset,
    resetPassword,
    getAuthToken,
    isAuthenticated
  };
  
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
