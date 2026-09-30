import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export default function StudentAnalytics() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await apiClient.get('/metrics/dashboard');
        setMetrics(response.data.data);
      } catch (err) {
        console.error("Failed to fetch metrics", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  const completedAssessments = metrics?.completed_assessments ?? 0;
  const enrolledSubjects = metrics?.enrolled_subjects ?? 0;

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-on-surface">Analytics</h1>
        <p className="text-[13px] text-on-surface-variant mt-1">Track your academic performance and progress</p>
      </div>

      {/* Summary Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col gap-2">
          <span className="text-[11px] text-secondary uppercase tracking-wider font-semibold">Assessments Done</span>
          <div className="text-2xl font-bold text-on-surface">{completedAssessments}</div>
          <div className="text-[12px] text-on-surface-variant">This semester</div>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col gap-2">
          <span className="text-[11px] text-secondary uppercase tracking-wider font-semibold">Subjects Enrolled</span>
          <div className="text-2xl font-bold text-on-surface">{enrolledSubjects}</div>
          <div className="text-[12px] text-on-surface-variant">Active subjects</div>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col gap-2">
          <span className="text-[11px] text-secondary uppercase tracking-wider font-semibold">Avg. Score</span>
          <div className="text-2xl font-bold text-on-surface">—</div>
          <div className="text-[12px] text-on-surface-variant">Not enough data</div>
        </div>
      </section>

      {/* Performance Chart Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 min-h-[300px] flex flex-col">
          <h2 className="text-[15px] font-semibold text-on-surface mb-4">Performance Trend</h2>
          <div className="flex-1 bg-surface-container/50 rounded-lg flex flex-col items-center justify-center gap-3 p-6">
            <span className="material-symbols-outlined text-[48px] text-outline">insights</span>
            <p className="text-[13px] text-on-surface-variant text-center">Performance trends will appear once you complete more assessments.</p>
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 min-h-[300px] flex flex-col">
          <h2 className="text-[15px] font-semibold text-on-surface mb-4">Subject-wise Breakdown</h2>
          <div className="flex-1 bg-surface-container/50 rounded-lg flex flex-col items-center justify-center gap-3 p-6">
            <span className="material-symbols-outlined text-[48px] text-outline">donut_large</span>
            <p className="text-[13px] text-on-surface-variant text-center">Subject-wise analysis will appear here.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
