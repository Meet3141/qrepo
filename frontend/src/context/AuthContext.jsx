import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../api/auth';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const userData = await authService.getCurrentUser();
        setUser(userData);
        if (userData?.role?.name) {
          localStorage.setItem('user_role', userData.role.name);
        }
      } catch (error) {
        console.error('Failed to authenticate:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user_role');
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();

    const handleUnauthorized = () => {
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user_role');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  // Called after successful login — token already stored by authService.login()
  const login = (userData) => {
    setUser(userData);
    if (userData?.role?.name) {
      localStorage.setItem('user_role', userData.role.name);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_role');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role?.name || null,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
