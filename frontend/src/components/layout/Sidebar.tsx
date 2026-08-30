import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const Sidebar = () => {
  const { role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="hidden md:flex flex-col h-screen w-64 rounded-r-xl border-r border-outline-variant dark:border-outline shadow-md bg-surface-container-lowest dark:bg-inverse-surface p-md gap-sm shrink-0">
      <div className="mb-xl flex items-center gap-sm">
        <div className="w-10 h-10 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-headline-md">Q</div>
        <div>
          <h1 className="font-headline-lg text-headline-lg font-black text-primary dark:text-primary-fixed">QRepo</h1>
          <p className="font-label-sm text-label-sm text-on-surface-variant">Enterprise Assessment</p>
        </div>
      </div>
      
      <button className="w-full py-2 px-4 bg-primary text-on-primary rounded-lg font-label-md text-label-md mb-md hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm flex justify-center items-center gap-2">
        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
        Create New
      </button>
      
      <div className="flex-1 flex flex-col gap-xs">
        <a className="flex items-center gap-md px-md py-2 bg-secondary-container dark:bg-secondary text-on-secondary-container dark:text-on-secondary rounded-lg font-semibold duration-200 ease-in-out transform active:scale-95 font-label-md text-label-md" href="#">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
          Dashboard
        </a>
        <a className="flex items-center gap-md px-md py-2 text-secondary dark:text-secondary-fixed-dim hover:bg-surface-container-high dark:hover:bg-on-secondary-fixed-variant transition-all rounded-lg duration-200 ease-in-out transform active:scale-95 font-label-md text-label-md" href="#">
          <span className="material-symbols-outlined">menu_book</span>
          Subjects
        </a>
        <a className="flex items-center gap-md px-md py-2 text-secondary dark:text-secondary-fixed-dim hover:bg-surface-container-high dark:hover:bg-on-secondary-fixed-variant transition-all rounded-lg duration-200 ease-in-out transform active:scale-95 font-label-md text-label-md" href="#">
          <span className="material-symbols-outlined">analytics</span>
          Analytics
        </a>
      </div>
      
      <div className="mt-auto flex flex-col gap-xs pt-md border-t border-outline-variant">
        <a className="flex items-center gap-md px-md py-2 text-secondary dark:text-secondary-fixed-dim hover:bg-surface-container-high dark:hover:bg-on-secondary-fixed-variant transition-all rounded-lg duration-200 ease-in-out transform active:scale-95 font-label-md text-label-md" href="#">
          <span className="material-symbols-outlined">settings</span>
          Settings
        </a>
        <button onClick={handleLogout} className="flex items-center gap-md px-md py-2 text-error hover:bg-error-container transition-all rounded-lg duration-200 ease-in-out transform active:scale-95 font-label-md text-label-md">
          <span className="material-symbols-outlined">logout</span>
          Logout
        </button>
      </div>
    </nav>
  );
};
