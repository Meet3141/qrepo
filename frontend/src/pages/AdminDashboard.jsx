import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [metricsRes, subjectsRes] = await Promise.allSettled([
          apiClient.get('/metrics/dashboard'),
          apiClient.get('/subjects'),
        ]);
        if (metricsRes.status === 'fulfilled') setMetrics(metricsRes.value.data.data);
        if (subjectsRes.status === 'fulfilled') setSubjects(subjectsRes.value.data.data || []);
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalUsers = metrics?.total_users ?? '—';
  const storageUsed = metrics?.storage_used ?? '—';
  const systemHealth = metrics?.system_health ?? '—';
  const subjectCount = subjects.length || '—';

  return (
    <div className="w-full flex flex-col gap-6">
      {/* KPIs Bento Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Total Users */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow">
          <div className="flex justify-between items-start">
            <span className="text-[11px] text-secondary uppercase tracking-wider font-semibold">Total Users</span>
            <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-[16px]">group</span>
            </div>
          </div>
          <div className="text-2xl font-semibold text-on-surface mt-1">{totalUsers}</div>
          <div className="flex items-center gap-1 text-primary text-[11px] font-medium">
            <span className="material-symbols-outlined text-[14px]">trending_up</span>
            <span>+4% this week</span>
          </div>
        </div>

        {/* KPI 2: Departments */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow">
          <div className="flex justify-between items-start">
            <span className="text-[11px] text-secondary uppercase tracking-wider font-semibold">Departments</span>
            <div className="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary shrink-0">
              <span className="material-symbols-outlined text-[16px]">domain</span>
            </div>
          </div>
          <div className="text-2xl font-semibold text-on-surface mt-1">48</div>
          <div className="text-[12px] text-on-surface-variant">Across 3 campuses</div>
        </div>

        {/* KPI 3: Subjects */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow">
          <div className="flex justify-between items-start">
            <span className="text-[11px] text-secondary uppercase tracking-wider font-semibold">Subjects</span>
            <div className="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary shrink-0">
              <span className="material-symbols-outlined text-[16px]">book</span>
            </div>
          </div>
          <div className="text-2xl font-semibold text-on-surface mt-1">{subjectCount}</div>
          <div className="text-[12px] text-on-surface-variant">Active curriculum items</div>
        </div>

        {/* KPI 4: Active AI Jobs */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow">
          <div className="flex justify-between items-start">
            <span className="text-[11px] text-secondary uppercase tracking-wider font-semibold">Active AI Jobs</span>
            <div className="w-8 h-8 rounded-full bg-tertiary-fixed flex items-center justify-center text-tertiary shrink-0">
              <span className="material-symbols-outlined text-[16px]">psychology</span>
            </div>
          </div>
          <div className="text-2xl font-semibold text-on-surface mt-1">12</div>
          <div className="flex items-center gap-1.5 text-tertiary text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
            <span>Processing</span>
          </div>
        </div>

        {/* KPI 5: Storage */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col justify-between hover:shadow-sm transition-shadow sm:col-span-2 lg:col-span-1">
          <div className="flex justify-between items-start">
            <span className="text-[11px] text-secondary uppercase tracking-wider font-semibold">Storage Usage</span>
            <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant shrink-0">
              <span className="material-symbols-outlined text-[16px]">cloud</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex justify-between items-end mb-2">
              <span className="text-lg font-semibold text-on-surface">78%</span>
              <span className="text-[11px] text-on-surface-variant">3.9TB / 5.0TB</span>
            </div>
            <div className="w-full bg-surface-variant rounded-full h-1.5 overflow-hidden">
              <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: '78%' }}></div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content: Chart + Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Chart Area */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex-1 min-h-[350px] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-[15px] font-semibold text-on-surface">AI Infrastructure Performance</h2>
              <button className="text-on-surface-variant hover:bg-surface-container-high p-1.5 rounded-lg transition-colors">
                <span className="material-symbols-outlined text-[20px]">more_vert</span>
              </button>
            </div>
            <div className="flex-1 bg-surface-container rounded-lg border border-outline-variant/50 flex flex-col items-center justify-center gap-3 p-6">
              <span className="material-symbols-outlined text-[48px] text-outline">monitoring</span>
              <p className="text-[13px] text-on-surface-variant text-center">Performance metrics will appear here once AI jobs have been processed.</p>
            </div>
          </div>
        </div>

        {/* Right Panel: Logs */}
        <div className="flex flex-col gap-6">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex-1 min-h-[350px] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-[15px] font-semibold text-on-surface">Recent System Logs</h2>
              <button className="text-primary text-[12px] font-medium hover:underline">View All</button>
            </div>
            <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
              {/* Log entries */}
              {[
                { icon: 'person_add', text: 'New user registered: faculty@qrepo.edu', time: '2 min ago', color: 'text-primary' },
                { icon: 'security', text: 'Role changed: HOD → Admin for user #42', time: '15 min ago', color: 'text-secondary' },
                { icon: 'psychology', text: 'AI job completed: Bloom\'s analysis #128', time: '1 hr ago', color: 'text-tertiary' },
                { icon: 'warning', text: 'Storage threshold warning at 78%', time: '3 hrs ago', color: 'text-error' },
                { icon: 'cloud_upload', text: 'Bulk document upload: 24 files processed', time: '5 hrs ago', color: 'text-on-surface-variant' },
              ].map((log, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-surface-container/50 rounded-lg hover:bg-surface-container transition-colors">
                  <span className={`material-symbols-outlined text-[18px] mt-0.5 shrink-0 ${log.color}`}>{log.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] text-on-surface leading-snug">{log.text}</p>
                    <span className="text-[10px] text-outline mt-1 block">{log.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
