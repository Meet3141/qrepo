import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface RoleRouteProps {
  allowedRoles: string[];
}

export const RoleRoute: React.FC<RoleRouteProps> = ({ allowedRoles }) => {
  const { role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!role || !allowedRoles.includes(role.toLowerCase())) {
    // Redirect to their respective dashboard if they don't have access
    const roleMap: Record<string, string> = {
      student: '/student/dashboard',
      faculty: '/faculty/dashboard',
      hod: '/hod/dashboard',
      admin: '/admin/dashboard',
    };
    
    const redirectPath = role ? (roleMap[role.toLowerCase()] || '/splash') : '/login';
    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />;
};
