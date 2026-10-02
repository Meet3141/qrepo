import React, { useState, useEffect } from 'react';
import { subjectService } from '../api/subjects';
import { notifyError } from '../api/errors';

export default function StudentAnalytics() {
  const [subjects, setSubjects] = useState(null);

  useEffect(() => {
    subjectService.getSubjects().then(setSubjects).catch((err) => { setSubjects([]); notifyError(err, 'Failed to load subjects.'); });
  }, []);

  // No assessment results are recorded in QRepo yet; the backend has no student-performance endpoints
  const enrolledSubjects = subjects ? subjects.length : '—';

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
          <div className="text-2xl font-bold text-on-surface">—</div>
          <div className="text-[12px] text-on-surface-variant">Not tracked yet</div>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col gap-2">
          <span className="text-[11px] text-secondary uppercase tracking-wider font-semibold">Subjects Enrolled</span>
          <div className="text-2xl font-bold text-on-surface">{enrolledSubjects}</div>
          <div className="text-[12px] text-on-surface-variant">Available subjects</div>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col gap-2">
          <span className="text-[11px] text-secondary uppercase tracking-wider font-semibold">Avg. Score</span>
          <div className="text-2xl font-bold text-on-surface">—</div>
          <div className="text-[12px] text-on-surface-variant">Not tracked yet</div>
        </div>
      </section>

      {/* Performance Chart Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 min-h-[300px] flex flex-col">
          <h2 className="text-[15px] font-semibold text-on-surface mb-4">Performance Trend</h2>
          <div className="flex-1 bg-surface-container/50 rounded-lg flex flex-col items-center justify-center gap-3 p-6">
            <span className="material-symbols-outlined text-[48px] text-outline">insights</span>
            <p className="text-[13px] text-on-surface-variant text-center">Performance trends need assessment results, which QRepo does not record yet.</p>
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 min-h-[300px] flex flex-col">
          <h2 className="text-[15px] font-semibold text-on-surface mb-4">Subject-wise Breakdown</h2>
          <div className="flex-1 bg-surface-container/50 rounded-lg flex flex-col items-center justify-center gap-3 p-6">
            <span className="material-symbols-outlined text-[48px] text-outline">donut_large</span>
            <p className="text-[13px] text-on-surface-variant text-center">Subject-wise analysis will be available once results are recorded.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
