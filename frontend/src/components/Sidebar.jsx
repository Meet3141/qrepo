import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '../utils/cn';
import { useAuth } from '../context/AuthContext';

const getNavItems = (role) => {
  const r = (role || 'Student').toLowerCase();

  if (r === 'admin') {
    return [
      { icon: 'dashboard', label: 'Dashboard', to: '/dashboard/admin' },
      { icon: 'group', label: 'User Management', to: '/admin/users' },
      { icon: 'domain', label: 'Dept & Roles', to: '/admin/roles' },
      { icon: 'auto_stories', label: 'Subjects', to: '/dashboard/subjects' },
      { icon: 'description', label: 'Documents', to: '/dashboard/documents' },
      { icon: 'quiz', label: 'Question Bank', to: '/question-bank' },
      { icon: 'list_alt', label: 'System Logs', to: '/settings/ai' },
      { icon: 'psychology', label: 'AI Configuration', to: '/settings/ai' },
    ];
  }
  if (r === 'hod') {
    return [
      { icon: 'dashboard', label: 'Dashboard', to: '/dashboard/hod' },
      { icon: 'group', label: 'Faculty', to: '/hod/faculty' },
      { icon: 'fact_check', label: 'Approvals', to: '/hod/approvals' },
      { icon: 'auto_stories', label: 'Subjects', to: '/dashboard/subjects' },
      { icon: 'description', label: 'Documents', to: '/dashboard/documents' },
      { icon: 'quiz', label: 'Question Bank', to: '/question-bank' },
    ];
  }
  if (r === 'faculty') {
    return [
      { icon: 'dashboard', label: 'Dashboard', to: '/dashboard/faculty' },
      { icon: 'auto_stories', label: 'Subjects', to: '/dashboard/subjects' },
      { icon: 'description', label: 'Documents', to: '/dashboard/documents' },
      { icon: 'quiz', label: 'Question Bank', to: '/question-bank' },
      { icon: 'note_add', label: 'Paper Generator', to: '/generator' },
      { icon: 'history_edu', label: 'Generated Papers', to: '/dashboard/papers' },
      { icon: 'analytics', label: 'Analytics', to: '/faculty/analytics' },
    ];
  }
  // Default: Student
  return [
    { icon: 'dashboard', label: 'Dashboard', to: '/dashboard/student' },
    { icon: 'menu_book', label: 'My Subjects', to: '/student/subjects' },
    { icon: 'analytics', label: 'Analytics', to: '/student/analytics' },
  ];
};

export default function Sidebar({ isOpen, onClose }) {
  const { role, logout } = useAuth();
  const navItems = getNavItems(role);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      className={cn(
        "bg-surface-container-low h-screen w-64 fixed left-0 top-0 border-r border-outline-variant z-50 flex flex-col py-4 px-3 transition-transform duration-200 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      {/* Header */}
      <div className="mb-6 px-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-on-primary-container text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            school
          </span>
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-extrabold text-primary truncate">QRepo</h1>
          <p className="text-[11px] text-on-surface-variant truncate">Enterprise Assessment</p>
        </div>
        {/* Close button - mobile only */}
        <button onClick={onClose} className="md:hidden ml-auto p-1 text-on-surface-variant hover:text-on-surface rounded-full">
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to + item.label}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 mx-1 px-4 py-2.5 rounded-lg text-[13px] transition-all duration-200",
                isActive
                  ? "bg-secondary-container text-on-secondary-container font-semibold"
                  : "text-on-surface-variant hover:bg-surface-container-highest"
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{ fontVariationSettings: isActive ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 400" }}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="mt-auto pt-3 border-t border-outline-variant flex flex-col gap-0.5">
        <NavLink
          to="/settings/ai"
          onClick={onClose}
          className="flex items-center gap-3 mx-1 px-4 py-2.5 text-on-surface-variant hover:bg-surface-container-highest rounded-lg text-[13px] transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">settings</span>
          <span>Settings</span>
        </NavLink>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 mx-1 px-4 py-2.5 text-on-surface-variant hover:bg-error-container/30 hover:text-error rounded-lg text-[13px] transition-colors text-left"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
