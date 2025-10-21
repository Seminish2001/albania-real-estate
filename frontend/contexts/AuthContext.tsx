'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '../types';
import api from '../lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: 'user' | 'agent';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (token) {
        const response = await api.get('/auth/me');
        setUser(response.data.data);
      }
    } catch (error) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    const { token, user } = response.data.data;
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
    setUser(user);
  };

  const register = async (userData: RegisterData) => {
    const response = await api.post('/auth/register', userData);
    const { token, user } = response.data.data;
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
    setUser(user);
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      window.location.href = '/';
    }
    setUser(null);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
