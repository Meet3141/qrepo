import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { subjectService } from '../api/subjects';
import { facultyApi, papersApi } from '../api/platform';
import { notifyError } from '../api/errors';

export default function HodDashboard() {
  const [subjects, setSubjects] = useState(null);
  const [faculty, setFaculty] = useState(null);
  const [papers, setPapers] = useState(null);

  useEffect(() => {
    subjectService.getSubjects().then(setSubjects).catch((err) => { setSubjects([]); notifyError(err, 'Failed to load subjects.'); });
    facultyApi.list().then(setFaculty).catch((err) => notifyError(err, 'Failed to load faculty.'));
    papersApi.list({ page_size: 1 }).then(setPapers).catch((err) => notifyError(err, 'Failed to load paper statistics.'));
  }, []);

  const facultyCount = faculty ? faculty.items.filter((f) => f.is_active).length : '—';
  const pendingApprovals = papers ? papers.status_counts.PENDING_REVIEW || 0 : '—';
  const totalPapers = papers ? papers.total : '—';
  const departmentNames = faculty?.departments.map((d) => d.code).join(', ');

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Welcome Banner */}
      <div className="bg-primary text-on-primary rounded-xl p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-primary-container rounded-full opacity-30 blur-2xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Department Overview</h2>
            <p className="text-sm opacity-80">Manage faculty, review papers, and track department performance.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/hod/approvals" className="bg-on-primary text-primary text-[13px] py-2 px-4 rounded-lg font-semibold hover:shadow-md transition-all">
              Review Papers
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow">
          <div className="flex justify-between items-start">
            <span className="text-[11px] text-secondary uppercase tracking-wider font-semibold">Faculty Count</span>
            <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-[16px]">groups</span>
            </div>
          </div>
          <div className="text-2xl font-semibold text-on-surface">{facultyCount}</div>
          <div className="text-[12px] text-on-surface-variant truncate">{departmentNames ? `Active in ${departmentNames}` : 'Active members'}</div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow">
          <div className="flex justify-between items-start">
            <span className="text-[11px] text-secondary uppercase tracking-wider font-semibold">Pending Approvals</span>
            <div className="w-8 h-8 rounded-full bg-tertiary-fixed flex items-center justify-center text-tertiary shrink-0">
              <span className="material-symbols-outlined text-[16px]">pending_actions</span>
            </div>
          </div>
          <div className="text-2xl font-semibold text-on-surface">{pendingApprovals}</div>
          {pendingApprovals > 0 ? (
            <Link to="/hod/approvals" className="flex items-center gap-1 text-error text-[11px] font-medium hover:underline">
              <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
              <span>Requires attention</span>
            </Link>
          ) : (
            <div className="text-[12px] text-on-surface-variant">Queue is clear</div>
          )}
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow">
          <div className="flex justify-between items-start">
            <span className="text-[11px] text-secondary uppercase tracking-wider font-semibold">Total Papers</span>
            <div className="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary shrink-0">
              <span className="material-symbols-outlined text-[16px]">description</span>
            </div>
          </div>
          <div className="text-2xl font-semibold text-on-surface">{totalPapers}</div>
          <div className="text-[12px] text-on-surface-variant">{papers ? `${papers.status_counts.APPROVED || 0} approved` : 'All papers'}</div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow">
          <div className="flex justify-between items-start">
            <span className="text-[11px] text-secondary uppercase tracking-wider font-semibold">Subjects</span>
            <div className="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary shrink-0">
              <span className="material-symbols-outlined text-[16px]">auto_stories</span>
            </div>
          </div>
          <div className="text-2xl font-semibold text-on-surface">{subjects ? subjects.length : '—'}</div>
          <div className="text-[12px] text-on-surface-variant">Subjects in QRepo</div>
        </div>
      </section>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Subjects List */}
        <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[15px] font-semibold text-on-surface">Subjects</h2>
            <Link to="/dashboard/subjects" className="text-primary text-[12px] font-medium hover:underline">Manage</Link>
          </div>
          {subjects === null ? (
            <p className="text-[13px] text-secondary p-3">Loading subjects...</p>
          ) : subjects.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 bg-surface-container/50 rounded-lg min-h-[200px]">
              <span className="material-symbols-outlined text-[48px] text-outline">auto_stories</span>
              <p className="text-[13px] text-on-surface-variant text-center">No subjects yet. Create one under Subjects.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {subjects.slice(0, 6).map((subject) => (
                <div key={subject.id} className="flex items-center gap-3 p-3 bg-surface-container/50 rounded-lg hover:bg-surface-container transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-primary-container/20 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px] text-primary">auto_stories</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-on-surface truncate">{subject.name}</p>
                    <p className="text-[11px] text-on-surface-variant">{subject.code || 'No code'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col">
          <h2 className="text-[15px] font-semibold text-on-surface mb-4">Quick Actions</h2>
          <div className="flex flex-col gap-2">
            <Link to="/hod/approvals" className="flex items-center gap-3 p-3 bg-surface-container/50 rounded-lg hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-[18px] text-primary">fact_check</span>
              <span className="text-[13px] text-on-surface">Review Pending Papers</span>
              <span className="material-symbols-outlined text-[16px] text-outline ml-auto">chevron_right</span>
            </Link>
            <Link to="/hod/faculty" className="flex items-center gap-3 p-3 bg-surface-container/50 rounded-lg hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-[18px] text-secondary">group</span>
              <span className="text-[13px] text-on-surface">Manage Faculty</span>
              <span className="material-symbols-outlined text-[16px] text-outline ml-auto">chevron_right</span>
            </Link>
            <Link to="/dashboard/subjects" className="flex items-center gap-3 p-3 bg-surface-container/50 rounded-lg hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-[18px] text-tertiary">auto_stories</span>
              <span className="text-[13px] text-on-surface">View Subjects</span>
              <span className="material-symbols-outlined text-[16px] text-outline ml-auto">chevron_right</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
