import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';

export default function StudentDashboard() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const subjectsRes = await apiClient.get('/subjects');
        setSubjects(subjectsRes.data.data || []);
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const enrolledSubjects = subjects.length;
  const upcomingExams = 0;
  const completedAssessments = 0;

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Welcome Banner */}
      <div className="bg-primary text-on-primary rounded-xl p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-primary-container rounded-full opacity-30 blur-2xl"></div>
        <div className="absolute right-16 -bottom-16 w-36 h-36 bg-tertiary rounded-full opacity-20 blur-3xl"></div>
        <div className="relative z-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">Welcome back, Student</h2>
          <p className="text-sm opacity-80">Track your subjects, assessments, and performance analytics all in one place.</p>
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
          <div className="text-[12px] text-on-surface-variant">Current semester</div>
        </div>

        {/* Upcoming Exams */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow">
          <div className="flex justify-between items-start">
            <span className="text-[11px] text-secondary uppercase tracking-wider font-semibold">Upcoming Exams</span>
            <div className="w-8 h-8 rounded-full bg-tertiary-fixed flex items-center justify-center text-tertiary shrink-0">
              <span className="material-symbols-outlined text-[16px]">event</span>
            </div>
          </div>
          <div className="text-2xl font-semibold text-on-surface">{upcomingExams}</div>
          <div className="text-[12px] text-on-surface-variant">Scheduled this month</div>
        </div>

        {/* Completed Assessments */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow">
          <div className="flex justify-between items-start">
            <span className="text-[11px] text-secondary uppercase tracking-wider font-semibold">Completed</span>
            <div className="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary shrink-0">
              <span className="material-symbols-outlined text-[16px]">task_alt</span>
            </div>
          </div>
          <div className="text-2xl font-semibold text-on-surface">{completedAssessments}</div>
          <div className="text-[12px] text-on-surface-variant">Assessments completed</div>
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
          {subjects.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 bg-surface-container/50 rounded-lg min-h-[200px]">
              <span className="material-symbols-outlined text-[48px] text-outline">school</span>
              <p className="text-[13px] text-on-surface-variant text-center">No subjects enrolled yet. Contact your faculty for enrollment.</p>
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
                    <p className="text-[11px] text-on-surface-variant truncate">{subject.code || 'No code'}</p>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-outline">chevron_right</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col">
          <h2 className="text-[15px] font-semibold text-on-surface mb-4">Recent Activity</h2>
          <div className="flex-1 flex flex-col gap-3">
            {[
              { icon: 'description', text: 'New paper available: CS301 Mid-Term', time: '1 hr ago', color: 'text-primary' },
              { icon: 'grading', text: 'Assessment graded: MA201 Quiz 3', time: '3 hrs ago', color: 'text-tertiary' },
              { icon: 'notifications', text: 'Reminder: Submit CS201 assignment', time: '5 hrs ago', color: 'text-secondary' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-surface-container/50 rounded-lg">
                <span className={`material-symbols-outlined text-[18px] mt-0.5 shrink-0 ${item.color}`}>{item.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] text-on-surface leading-snug">{item.text}</p>
                  <span className="text-[10px] text-outline mt-1 block">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
