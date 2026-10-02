import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { subjectService } from '../api/subjects';
import { notifyError } from '../api/errors';
import { useSession } from '../components/Session';

export default function StudentDashboard() {
  const { user } = useSession();
  const [subjects, setSubjects] = useState(null);

  useEffect(() => {
    subjectService.getSubjects().then(setSubjects).catch((err) => { setSubjects([]); notifyError(err, 'Failed to load subjects.'); });
  }, []);

  // QRepo has no enrolment, exam-schedule or results data yet, so those cards say so instead of showing 0
  const enrolledSubjects = subjects ? subjects.length : '—';

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Welcome Banner */}
      <div className="bg-primary text-on-primary rounded-xl p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-primary-container rounded-full opacity-30 blur-2xl"></div>
        <div className="absolute right-16 -bottom-16 w-36 h-36 bg-tertiary rounded-full opacity-20 blur-3xl"></div>
        <div className="relative z-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">Welcome back{user?.full_name ? `, ${user.full_name}` : ''}</h2>
          <p className="text-sm opacity-80">Browse the subjects and units available in QRepo.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Enrolled Subjects */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow">
          <div className="flex justify-between items-start">
            <span className="text-[11px] text-secondary uppercase tracking-wider font-semibold">Enrolled Subjects</span>
            <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-[16px]">menu_book</span>
            </div>
          </div>
          <div className="text-2xl font-semibold text-on-surface">{enrolledSubjects}</div>
          <div className="text-[12px] text-on-surface-variant">Available subjects</div>
        </div>

        {/* Upcoming Exams */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow">
          <div className="flex justify-between items-start">
            <span className="text-[11px] text-secondary uppercase tracking-wider font-semibold">Upcoming Exams</span>
            <div className="w-8 h-8 rounded-full bg-tertiary-fixed flex items-center justify-center text-tertiary shrink-0">
              <span className="material-symbols-outlined text-[16px]">event</span>
            </div>
          </div>
          <div className="text-2xl font-semibold text-on-surface">—</div>
          <div className="text-[12px] text-on-surface-variant">Exam schedules aren't tracked yet</div>
        </div>

        {/* Completed Assessments */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow">
          <div className="flex justify-between items-start">
            <span className="text-[11px] text-secondary uppercase tracking-wider font-semibold">Completed</span>
            <div className="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary shrink-0">
              <span className="material-symbols-outlined text-[16px]">task_alt</span>
            </div>
          </div>
          <div className="text-2xl font-semibold text-on-surface">—</div>
          <div className="text-[12px] text-on-surface-variant">Results aren't tracked yet</div>
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* My Subjects */}
        <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[15px] font-semibold text-on-surface">My Subjects</h2>
            <Link to="/student/subjects" className="text-primary text-[12px] font-medium hover:underline">View All</Link>
          </div>
          {subjects === null ? (
            <p className="text-[13px] text-secondary p-3">Loading subjects...</p>
          ) : subjects.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 bg-surface-container/50 rounded-lg min-h-[200px]">
              <span className="material-symbols-outlined text-[48px] text-outline">school</span>
              <p className="text-[13px] text-on-surface-variant text-center">No subjects have been added yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {subjects.slice(0, 5).map((subject) => (
                <Link to="/student/subjects" key={subject.id} className="flex items-center gap-3 p-3 bg-surface-container/50 rounded-lg hover:bg-surface-container transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-primary-container/20 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px] text-primary">auto_stories</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-on-surface truncate">{subject.name}</p>
                    <p className="text-[11px] text-on-surface-variant truncate">{subject.code || 'No code'}</p>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-outline">chevron_right</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col">
          <h2 className="text-[15px] font-semibold text-on-surface mb-4">Recent Activity</h2>
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 bg-surface-container/50 rounded-lg">
            <span className="material-symbols-outlined text-[40px] text-outline">notifications_off</span>
            <p className="text-[13px] text-on-surface-variant text-center">No recent activity. QRepo does not share papers or results with students yet.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
