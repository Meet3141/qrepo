import React from 'react';
import { useAuth } from '../../context/AuthContext';

export const Header = () => {
  const { user } = useAuth();

  return (
    <header className="flex items-center justify-between px-md w-full sticky top-0 z-40 bg-surface dark:bg-surface-dim border-b border-outline-variant dark:border-outline shadow-sm h-16 shrink-0">
      <div className="md:hidden font-display text-display-mobile font-bold text-primary dark:text-primary-fixed">QRepo</div>
      <div className="hidden md:flex flex-1 max-w-md ml-lg">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
          <input className="w-full h-10 pl-10 pr-4 rounded-full bg-surface-container-low border-none focus:ring-2 focus:ring-primary text-body-md" placeholder="Search assessments, subjects..." type="text"/>
        </div>
      </div>
      <div className="flex items-center gap-md ml-auto">
        <button className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors cursor-pointer active:opacity-80">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block font-label-md text-label-md font-bold">{user?.email?.split('@')[0] || 'User'}</span>
            <img className="w-8 h-8 rounded-full object-cover border border-outline-variant" alt="Profile" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAHDk3g5zA1vJBp8RC08NXWLsmO2b8anDUkKXGmHyBj8ePYjadKlLVmw4e7LOvlLvyhBQM1Ap_HlHZjDTRCMn8h90DyFXQde2IKc6UjTrhEJfCEZP5A2aOSThYNFYEvzKzJ-xXvbNnj--GMEaJbBhwjIWyxrtsCWAhq14BMjK0JzezqWkFonjA-Br7gGpNSUo4I_mXsBUKl5eNES9dmFd-6GWLeVcSb2F-zfnDqTwZFNS-17JDj9qU"/>
        </div>
      </div>
    </header>
  );
};
