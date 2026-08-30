import React from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';

const StudentDashboard = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <div className="max-w-container-max mx-auto space-y-lg">
        {/* Welcome Banner */}
        <div className="bg-surface-container-lowest rounded-xl p-lg relative overflow-hidden border border-outline-variant shadow-sm">
          <div className="relative z-10">
            <h2 className="font-display text-display text-primary">Welcome back, {user?.email?.split('@')[0] || 'Student'}</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant mt-sm">You're making great progress this semester. Keep up the momentum!</p>
          </div>
          <div className="absolute right-0 top-0 w-64 h-full opacity-10 pointer-events-none">
            <span className="material-symbols-outlined absolute right-10 top-1/2 -translate-y-1/2 text-primary" style={{ fontSize: '120px' }}>school</span>
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-lg">
          {/* Left Column */}
          <div className="md:col-span-8 space-y-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
              <div className="bg-surface-container-lowest rounded-xl p-md border border-outline-variant shadow-sm flex flex-col items-start hover:shadow-md transition-shadow">
                <span className="material-symbols-outlined text-primary mb-sm bg-primary-fixed p-2 rounded-lg" style={{ fontVariationSettings: "'FILL' 1" }}>grade</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">CGPA</span>
                <span className="font-headline-lg text-headline-lg font-bold text-on-surface mt-1">3.8</span>
              </div>
              <div className="bg-surface-container-lowest rounded-xl p-md border border-outline-variant shadow-sm flex flex-col items-start hover:shadow-md transition-shadow">
                <span className="material-symbols-outlined text-primary mb-sm bg-primary-fixed p-2 rounded-lg" style={{ fontVariationSettings: "'FILL' 1" }}>timeline</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Total Credits</span>
                <span className="font-headline-lg text-headline-lg font-bold text-on-surface mt-1">42</span>
              </div>
              <div className="bg-surface-container-lowest rounded-xl p-md border border-outline-variant shadow-sm flex flex-col items-start hover:shadow-md transition-shadow">
                <span className="material-symbols-outlined text-error mb-sm bg-error-container p-2 rounded-lg" style={{ fontVariationSettings: "'FILL' 1" }}>assignment_late</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Pending Tasks</span>
                <span className="font-headline-lg text-headline-lg font-bold text-on-surface mt-1">3</span>
              </div>
              <div className="bg-surface-container-lowest rounded-xl p-md border border-outline-variant shadow-sm flex flex-col items-start hover:shadow-md transition-shadow">
                <span className="material-symbols-outlined text-tertiary mb-sm bg-tertiary-fixed p-2 rounded-lg" style={{ fontVariationSettings: "'FILL' 1" }}>how_to_reg</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Attendance</span>
                <span className="font-headline-lg text-headline-lg font-bold text-on-surface mt-1">92%</span>
              </div>
            </div>
            
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden p-md text-center">
              <span className="material-symbols-outlined text-outline text-4xl mb-2">construction</span>
              <h3 className="font-headline-md text-on-surface mb-2">Dashboard under construction</h3>
              <p className="text-on-surface-variant text-body-md">Connect your backend APIs to populate this dashboard.</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;
