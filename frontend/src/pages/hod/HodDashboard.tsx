import React from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';

const HodDashboard = () => {
  return (
    <DashboardLayout>
      <div className="max-w-container-max mx-auto space-y-lg">
        {/* Welcome Banner */}
        <div className="bg-surface-container-lowest rounded-xl p-lg relative overflow-hidden border border-outline-variant shadow-sm">
          <div className="relative z-10">
            <h2 className="font-display text-display text-primary">HOD Dashboard</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant mt-sm">Department overview and approvals.</p>
          </div>
          <div className="absolute right-0 top-0 w-64 h-full opacity-10 pointer-events-none">
            <span className="material-symbols-outlined absolute right-10 top-1/2 -translate-y-1/2 text-primary" style={{ fontSize: '120px' }}>account_balance</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden p-xl text-center">
            <span className="material-symbols-outlined text-outline text-6xl mb-4">engineering</span>
            <h3 className="font-headline-md text-on-surface mb-2">HOD Dashboard Under Construction</h3>
            <p className="text-on-surface-variant text-body-md">Features currently being built.</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default HodDashboard;
