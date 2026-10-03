import React from 'react';
import { Link } from 'react-router-dom';
import { useSession } from './Session';
import { useTheme } from './ThemeProvider';
import { initials as initialsOf } from './ui';

export default function TopBar({ onMenuToggle }) {
  const { user, role } = useSession();
  const { theme, toggle } = useTheme();

  const roleName = role || 'User';
  const displayName = user?.full_name || user?.email || '';

  return (
    <header className="bg-surface-container-lowest border-b border-outline-variant sticky top-0 z-30 w-full shrink-0">
      <div className="flex justify-between items-center h-14 px-4 md:px-6">
        {/* Left: Mobile menu + Search */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={onMenuToggle}
            className="md:hidden text-on-surface-variant hover:bg-surface-container-high rounded-lg p-2 transition-colors shrink-0"
            aria-label="Open navigation"
          >
            <span className="material-symbols-outlined text-[22px]">menu</span>
          </button>

          {/* Search: there is no repository-wide search endpoint yet, so the field is shown disabled */}
          <div className="relative w-full max-w-sm hidden md:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
            <input
              className="bg-surface-container-low border border-outline-variant/50 focus:border-primary outline-none w-full pl-9 pr-4 h-9 rounded-lg text-[13px] text-on-surface placeholder:text-outline transition-colors disabled:cursor-not-allowed"
              placeholder="Search is not available yet"
              aria-label="Search across repository (not available yet)"
              type="text"
              disabled
            />
          </div>
        </div>

        {/* Right: Theme toggle + Profile */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={toggle}
            className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: theme === 'light' ? "'FILL' 1" : "'FILL' 0" }}>
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
          <Link
            to="/settings/ai"
            className="flex items-center gap-2 hover:bg-surface-container-high rounded-lg py-1.5 px-2 transition-colors"
            title={displayName}
          >
            <div className="w-7 h-7 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-xs shrink-0">
              {displayName ? initialsOf(displayName) : 'U'}
            </div>
            <div className="hidden sm:block text-left min-w-0">
              <div className="text-xs font-medium text-on-surface truncate max-w-[140px]">{user?.full_name || roleName}</div>
              {user?.full_name && <div className="text-[10px] text-on-surface-variant truncate max-w-[140px]">{roleName}</div>}
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
