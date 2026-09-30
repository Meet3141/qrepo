import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';

export default function FacultyDashboard() {
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
        console.error("Failed to fetch data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const mySubjects = metrics?.my_subjects ?? subjects.length;
  const generatedPapers = metrics?.generated_papers ?? 0;
  const pendingReviews = metrics?.pending_reviews ?? 0;
  const totalStudents = metrics?.total_students ?? 0;

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Welcome Banner */}
      <div className="bg-primary text-on-primary rounded-xl p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-primary-container rounded-full opacity-30 blur-2xl"></div>
        <div className="absolute right-16 -bottom-16 w-36 h-36 bg-tertiary rounded-full opacity-20 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Welcome back, Professor</h2>
            <p className="text-sm opacity-80">
              You have {pendingReviews} papers awaiting review. Your question bank is up to date.
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/generator" className="bg-on-primary text-primary text-[13px] py-2 px-4 rounded-lg font-semibold hover:shadow-md transition-all">
              Generate Paper
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow">
          <div className="flex justify-between items-start">
            <span className="text-[11px] text-secondary uppercase tracking-wider font-semibold">Active Subjects</span>
            <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-[16px]">collections_bookmark</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-on-surface">{mySubjects}</div>
          <div className="text-[12px] text-on-surface-variant">Current Semester</div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow">
          <div className="flex justify-between items-start">
            <span className="text-[11px] text-secondary uppercase tracking-wider font-semibold">Generated Papers</span>
            <div className="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary shrink-0">
              <span className="material-symbols-outlined text-[16px]">description</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-on-surface">{generatedPapers}</div>
          <div className="text-[12px] text-on-surface-variant">Total papers</div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow">
          <div className="flex justify-between items-start">
            <span className="text-[11px] text-secondary uppercase tracking-wider font-semibold">Papers Generated</span>
            <div className="w-8 h-8 rounded-full bg-tertiary-fixed flex items-center justify-center text-tertiary shrink-0">
              <span className="material-symbols-outlined text-[16px]">article</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-on-surface">{generatedPapers}</div>
          <div className="text-[12px] text-on-surface-variant">YTD Total</div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-tertiary-container"></div>
          <div className="flex justify-between items-start pl-2">
            <span className="text-[11px] text-secondary uppercase tracking-wider font-semibold">Pending Reviews</span>
            <div className="w-8 h-8 rounded-full bg-error-container/50 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[16px] text-error">pending_actions</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-on-surface pl-2">{pendingReviews}</div>
          <div className="text-[12px] text-tertiary-container font-semibold pl-2">Action Required</div>
        </div>
      </section>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Subjects */}
        <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[15px] font-semibold text-on-surface">My Subjects</h2>
            <Link to="/dashboard/subjects" className="text-primary text-[12px] font-medium hover:underline">View All</Link>
          </div>
          {subjects.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 bg-surface-container/50 rounded-lg min-h-[200px]">
              <span className="material-symbols-outlined text-[48px] text-outline">auto_stories</span>
              <p className="text-[13px] text-on-surface-variant text-center">No subjects assigned yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {subjects.slice(0, 5).map((subject) => (
                <div key={subject.id} className="flex items-center gap-3 p-3 bg-surface-container/50 rounded-lg hover:bg-surface-container transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-primary-container/20 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px] text-primary">auto_stories</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-on-surface truncate">{subject.name}</p>
                    <p className="text-[11px] text-on-surface-variant">{subject.code || 'No code'}</p>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-outline">chevron_right</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col">
          <h2 className="text-[15px] font-semibold text-on-surface mb-4">Quick Actions</h2>
          <div className="flex flex-col gap-2">
            <Link to="/generator" className="flex items-center gap-3 p-3 bg-surface-container/50 rounded-lg hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-[18px] text-primary">note_add</span>
              <span className="text-[13px] text-on-surface">Generate Paper</span>
              <span className="material-symbols-outlined text-[16px] text-outline ml-auto">chevron_right</span>
            </Link>
            <Link to="/question-bank" className="flex items-center gap-3 p-3 bg-surface-container/50 rounded-lg hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-[18px] text-secondary">quiz</span>
              <span className="text-[13px] text-on-surface">Question Bank</span>
              <span className="material-symbols-outlined text-[16px] text-outline ml-auto">chevron_right</span>
            </Link>
            <Link to="/faculty/analytics" className="flex items-center gap-3 p-3 bg-surface-container/50 rounded-lg hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-[18px] text-tertiary">analytics</span>
              <span className="text-[13px] text-on-surface">View Analytics</span>
              <span className="material-symbols-outlined text-[16px] text-outline ml-auto">chevron_right</span>
            </Link>
            <Link to="/dashboard/papers" className="flex items-center gap-3 p-3 bg-surface-container/50 rounded-lg hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">history_edu</span>
              <span className="text-[13px] text-on-surface">Generated Papers</span>
              <span className="material-symbols-outlined text-[16px] text-outline ml-auto">chevron_right</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
