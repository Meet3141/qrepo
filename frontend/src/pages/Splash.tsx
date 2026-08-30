import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Splash = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, role, isLoading } = useAuth();
  const from = location.state?.from?.pathname;

  useEffect(() => {
    // Wait for auth to load, then wait 2 seconds for splash effect, then navigate
    if (!isLoading) {
      const timer = setTimeout(() => {
        if (isAuthenticated && role) {
          if (from && from !== '/splash' && from !== '/login') {
             navigate(from, { replace: true });
          } else {
             const roleMap: Record<string, string> = {
                student: '/student/dashboard',
                faculty: '/faculty/dashboard',
                hod: '/hod/dashboard',
                admin: '/admin/dashboard',
             };
             navigate(roleMap[role.toLowerCase()] || '/login', { replace: true });
          }
        } else {
          navigate('/login', { replace: true });
        }
      }, 2000); // 2 second splash screen delay
      return () => clearTimeout(timer);
    }
  }, [isLoading, isAuthenticated, role, navigate, from]);

  return (
    <div className="bg-surface h-screen w-full flex items-center justify-center m-0 overflow-hidden relative font-body-lg">
      {/* Subtle gradient background overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white to-[#F8FAFC] opacity-90 z-0 pointer-events-none"></div>
      
      {/* Main Content Container */}
      <div className="relative z-10 flex flex-col items-center justify-center space-y-12 fade-in-up">
        {/* Logo Cluster */}
        <div className="relative flex items-center justify-center w-32 h-32">
          {/* Animated Rings */}
          <div className="absolute inset-0 rounded-full border-2 border-primary-fixed ring-anim"></div>
          <div className="absolute inset-0 rounded-full border-2 border-primary-fixed-dim ring-anim" style={{ animationDelay: '1.5s' }}></div>
          
          {/* Core Logo Circle */}
          <div className="relative w-24 h-24 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-lg z-10">
            <span className="material-symbols-outlined text-[48px]" data-weight="fill">
                dataset
            </span>
          </div>
        </div>
        
        {/* Typography */}
        <div className="flex flex-col items-center space-y-4 text-center">
          {/* Brand Name */}
          <h1 className="font-display text-display text-primary tracking-tight fade-in-up delay-300 opacity-0">
              QRepo
          </h1>
          
          {/* Tagline / Subtitle */}
          <div className="flex flex-col items-center space-y-1 fade-in-up delay-600 opacity-0">
            <p className="font-headline-md text-headline-md text-on-surface">
                Enterprise Assessment
            </p>
            <div className="flex items-center gap-2 mt-4 px-4 py-2 bg-surface-container-low border border-outline-variant rounded-full shadow-sm">
              <span className="material-symbols-outlined text-[16px] text-primary" data-weight="fill">
                  auto_awesome
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Powered by AI
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Splash;
