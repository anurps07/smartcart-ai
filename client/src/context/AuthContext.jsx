import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [vendor, setVendor] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('smartcart_token'));
  const [loading, setLoading] = useState(true);

  // Restore session from token on initial mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('smartcart_token');
      if (storedToken) {
        try {
          const res = await api.get('/auth/me');
          if (res.data?.success) {
            setUser(res.data.user);
            setVendor(res.data.vendor || null);
          }
        } catch (error) {
          console.warn('[Auth] Session restoration failed, clearing token:', error.message);
          localStorage.removeItem('smartcart_token');
          setToken(null);
          setUser(null);
          setVendor(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data?.success) {
      const authToken = res.data.token;
      localStorage.setItem('smartcart_token', authToken);
      setToken(authToken);
      setUser(res.data.user);
      setVendor(res.data.vendor || null);
      return res.data;
    }
  };

  const register = async (userData) => {
    const res = await api.post('/auth/register', userData);
    if (res.data?.success) {
      const authToken = res.data.token;
      localStorage.setItem('smartcart_token', authToken);
      setToken(authToken);
      setUser(res.data.user);
      setVendor(res.data.vendor || null);
      return res.data;
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await api.post('/auth/logout');
      }
    } catch (e) {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('smartcart_token');
      setToken(null);
      setUser(null);
      setVendor(null);
    }
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data?.success) {
        setUser(res.data.user);
        setVendor(res.data.vendor || null);
      }
    } catch (err) {
      console.error('[Auth] Failed to refresh profile:', err);
    }
  };

  const value = {
    user,
    vendor,
    token,
    loading,
    isAuthenticated: !!user,
    role: user?.role || null,
    isAdmin: user?.role === 'admin',
    isVendor: user?.role === 'vendor',
    isBuyer: user?.role === 'buyer',
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
