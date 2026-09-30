import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/login');
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="bg-surface h-screen w-full flex items-center justify-center m-0 overflow-hidden relative">
      {/* Subtle gradient background overlay to create the premium feel */}
      <div className="absolute inset-0 bg-gradient-to-br from-white to-[#F8FAFC] opacity-90 z-0 pointer-events-none"></div>
      
      {/* Main Content Container */}
      <div className="relative z-10 flex flex-col items-center justify-center space-y-12 animate-[float-up_1s_cubic-bezier(0.16,1,0.3,1)_forwards]">
        
        {/* Logo Cluster */}
        <div className="relative flex items-center justify-center w-32 h-32">
          {/* Animated Rings */}
          <div className="absolute inset-0 rounded-full border-2 border-primary-fixed animate-[pulse-ring_3s_cubic-bezier(0.4,0,0.2,1)_infinite]"></div>
          <div className="absolute inset-0 rounded-full border-2 border-primary-fixed-dim animate-[pulse-ring_3s_cubic-bezier(0.4,0,0.2,1)_infinite]" style={{ animationDelay: '1.5s' }}></div>
          
          {/* Core Logo Circle */}
          <div className="relative w-24 h-24 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-lg z-10">
            <span className="material-symbols-outlined text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              dataset
            </span>
          </div>
        </div>

        {/* Typography */}
        <div className="flex flex-col items-center space-y-4 text-center">
          {/* Brand Name */}
          <h1 className="text-4xl font-bold text-primary tracking-tight animate-[float-up_1s_cubic-bezier(0.16,1,0.3,1)_forwards] opacity-0" style={{ animationDelay: '300ms' }}>
            QRepo
          </h1>
          
          {/* Tagline / Subtitle */}
          <div className="flex flex-col items-center space-y-1 animate-[float-up_1s_cubic-bezier(0.16,1,0.3,1)_forwards] opacity-0" style={{ animationDelay: '600ms' }}>
            <p className="text-xl font-semibold text-on-surface">
              Enterprise Assessment
            </p>
            <div className="flex items-center gap-2 mt-4 px-4 py-2 bg-surface-container-low border border-outline-variant rounded-full shadow-sm">
              <span className="material-symbols-outlined text-[16px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                auto_awesome
              </span>
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                Powered by AI
              </span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.5; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes float-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
