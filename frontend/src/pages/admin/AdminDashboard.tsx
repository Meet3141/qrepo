import React from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';

const AdminDashboard = () => {
  return (
    <DashboardLayout>
      <div className="max-w-container-max mx-auto space-y-lg">
        {/* Welcome Banner */}
        <div className="bg-surface-container-lowest rounded-xl p-lg relative overflow-hidden border border-outline-variant shadow-sm bg-gradient-to-r from-surface-container-lowest to-surface-container-low">
          <div className="relative z-10">
            <h2 className="font-display text-display text-primary">System Administration</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant mt-sm">Manage users, configurations, and global settings.</p>
          </div>
          <div className="absolute right-0 top-0 w-64 h-full opacity-10 pointer-events-none">
            <span className="material-symbols-outlined absolute right-10 top-1/2 -translate-y-1/2 text-primary" style={{ fontSize: '120px' }}>admin_panel_settings</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden p-xl text-center">
            <span className="material-symbols-outlined text-outline text-6xl mb-4">settings_suggest</span>
            <h3 className="font-headline-md text-on-surface mb-2">Admin Dashboard Under Construction</h3>
            <p className="text-on-surface-variant text-body-md">System wide configuration options coming soon.</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
