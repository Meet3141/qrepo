import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const roleRedirectMap = {
  student: '/dashboard/student',
  faculty: '/dashboard/faculty',
  hod: '/dashboard/hod',
  admin: '/dashboard/admin',
};

export const RoleRoute = ({ allowedRoles }) => {
  const { role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const normalizedRole = role ? role.toLowerCase() : null;

  if (!normalizedRole || !allowedRoles.map((r) => r.toLowerCase()).includes(normalizedRole)) {
    const redirectPath = normalizedRole
      ? roleRedirectMap[normalizedRole] || '/login'
      : '/login';
    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />;
};
