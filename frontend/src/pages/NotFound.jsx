import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-[40px] text-outline">explore_off</span>
        </div>
        <h1 className="text-6xl font-bold text-primary mb-2">404</h1>
        <h2 className="text-xl font-semibold text-on-surface mb-3">Page Not Found</h2>
        <p className="text-[14px] text-on-surface-variant mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-primary text-on-primary py-2.5 px-5 rounded-lg text-[13px] font-medium hover:bg-primary/90 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">home</span>
          Back to Home
        </Link>
      </div>
    </div>
  );
}
