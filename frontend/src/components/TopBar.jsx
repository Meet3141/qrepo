import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function TopBar({ onMenuToggle }) {
  const { user, role } = useAuth();

  const roleName = role || 'User';
  const userEmail = user?.email || '';
  const initials = userEmail ? userEmail.charAt(0).toUpperCase() : 'U';

  return (
    <header className="bg-surface-container-lowest border-b border-outline-variant sticky top-0 z-30 w-full shrink-0">
      <div className="flex justify-between items-center h-14 px-4 md:px-6">
        {/* Left: Mobile menu + Search */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={onMenuToggle}
            className="md:hidden text-on-surface-variant hover:bg-surface-container-high rounded-lg p-2 transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[22px]">menu</span>
          </button>

          {/* Search */}
          <div className="relative w-full max-w-sm hidden md:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
            <input
              className="bg-surface-container-low border border-outline-variant/50 focus:border-primary outline-none w-full pl-9 pr-4 h-9 rounded-lg text-[13px] text-on-surface placeholder:text-outline transition-colors"
              placeholder="Search across repository..."
              type="text"
            />
          </div>
        </div>

        {/* Right: Actions & Profile */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button className="text-on-surface-variant hover:bg-surface-container-high rounded-lg p-2 transition-colors relative">
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full"></span>
          </button>
          <button className="text-on-surface-variant hover:bg-surface-container-high rounded-lg p-2 transition-colors hidden sm:block">
            <span className="material-symbols-outlined text-[20px]">help_outline</span>
          </button>

          <div className="h-5 w-px bg-outline-variant mx-1.5 hidden sm:block"></div>

          <button className="flex items-center gap-2 hover:bg-surface-container-high rounded-lg py-1.5 px-2 transition-colors">
            <div className="w-7 h-7 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-xs shrink-0">
              {initials}
            </div>
            <div className="hidden sm:block text-left min-w-0">
              <div className="text-xs font-medium text-on-surface truncate max-w-[100px]">{roleName}</div>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
