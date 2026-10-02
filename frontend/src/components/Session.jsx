import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../api/auth';
import { ERROR_MESSAGES, notifyError } from '../api/errors';
import { permissionsApi } from '../api/platform';
import { clearSession, dashboardFor, getRole, getToken, onSessionExpired, saveRole } from '../api/session';
import { toast } from './Toast';

const SessionContext = createContext(null);

/** Loads the signed-in user and their effective permissions once per app session. */
export function SessionProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState(null);

  useEffect(() => onSessionExpired(() => navigate('/login', { replace: true })), [navigate]);

  useEffect(() => {
    let cancelled = false;
    authService.getCurrentUser()
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        saveRole(me.role?.name || '');
      })
      .catch((err) => { if (!cancelled) notifyError(err, 'Could not load your profile.'); });
    // If this fails, actions stay visible and the backend still enforces access
    permissionsApi.mine().then((keys) => { if (!cancelled) setPermissions(keys); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const logout = useCallback(() => {
    clearSession();
    navigate('/login', { replace: true });
  }, [navigate]);

  const value = useMemo(() => ({
    user,
    role: user?.role?.name || getRole(),
    // null while loading, so callers can avoid flashing actions the user may not have
    can: (key) => (permissions ? permissions.includes(key) : null),
    logout,
  }), [user, permissions, logout]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);

/** Redirects to the login page when there is no token. */
export function RequireAuth({ children }) {
  const location = useLocation();
  if (!getToken()) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

function Forbidden({ to }) {
  useEffect(() => { toast.error(ERROR_MESSAGES[403].replace('perform this action', 'view that page')); }, []);
  return <Navigate to={to} replace />;
}

/** Restricts a route to roles the backend allows to use it; others go to their own dashboard. */
export function RequireRole({ roles, children }) {
  const role = useSession()?.role || getRole();
  if (roles && !roles.includes(role)) return <Forbidden to={dashboardFor(role)} />;
  return children;
}
