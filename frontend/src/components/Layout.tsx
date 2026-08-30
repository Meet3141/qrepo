import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

const ROLE_BADGE_CLASS: Record<string, string> = {
  Admin: 'role-admin',
  HOD: 'role-hod',
  Faculty: 'role-faculty',
  Student: 'role-student',
};

/**
 * Shared application shell: sticky top nav + scrollable content area.
 *
 * All authenticated pages should render their content inside <Layout>.
 * Nav links are role-aware — "Subjects" is visible to all roles.
 */
export const Layout = ({ children }: LayoutProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const roleName = user?.role?.name ?? '';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `nav-link${isActive ? ' nav-link-active' : ''}`;

  return (
    <div className="layout">
      <nav className="layout-nav">
        {/* Brand */}
        <NavLink to="/dashboard" className="nav-brand" aria-label="QRepo home">
          <span className="nav-brand-q">Q</span>Repo
        </NavLink>

        {/* Navigation links */}
        <div className="nav-links">
          <NavLink to="/dashboard" end className={linkClass}>Home</NavLink>
          <NavLink to="/subjects" className={linkClass}>Subjects</NavLink>
          {roleName === 'Admin'   && <NavLink to="/admin"   className={linkClass}>Admin Panel</NavLink>}
          {roleName === 'HOD'     && <NavLink to="/hod"     className={linkClass}>HOD Portal</NavLink>}
          {roleName === 'Faculty' && <NavLink to="/faculty" className={linkClass}>Faculty Tools</NavLink>}
          {roleName === 'Student' && <NavLink to="/student" className={linkClass}>Student Hub</NavLink>}
        </div>

        {/* Profile section */}
        <div className="nav-profile">
          {roleName && (
            <span className={`role-badge ${ROLE_BADGE_CLASS[roleName] ?? ''}`}>
              {roleName}
            </span>
          )}
          <span className="nav-email">{user?.email}</span>
          <button className="nav-logout" onClick={handleLogout}>Sign out</button>
        </div>
      </nav>

      <main className="layout-main">
        {children}
      </main>
    </div>
  );
};
