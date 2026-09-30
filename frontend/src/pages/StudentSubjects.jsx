import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export default function StudentSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await apiClient.get('/subjects');
        setSubjects(response.data.data || []);
      } catch (err) {
        console.error("Failed to fetch subjects", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSubjects();
  }, []);

  const filtered = subjects.filter(s =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-on-surface">My Subjects</h1>
          <p className="text-[13px] text-on-surface-variant mt-1">Browse and access your enrolled subjects</p>
        </div>
        <div className="relative w-full sm:w-64">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
          <input
            className="bg-surface-container-low border border-outline-variant/50 focus:border-primary outline-none w-full pl-9 pr-4 h-9 rounded-lg text-[13px] text-on-surface placeholder:text-outline transition-colors"
            placeholder="Search subjects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Subjects Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-12 flex flex-col items-center gap-4">
          <span className="material-symbols-outlined text-[56px] text-outline">school</span>
          <h3 className="text-[15px] font-semibold text-on-surface">No subjects found</h3>
          <p className="text-[13px] text-on-surface-variant text-center max-w-md">
            {searchTerm ? 'No subjects match your search.' : 'You are not enrolled in any subjects yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((subject) => (
            <div key={subject.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 hover:shadow-sm transition-shadow flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-container/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px] text-primary">auto_stories</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[14px] font-semibold text-on-surface truncate">{subject.name}</h3>
                  <p className="text-[11px] text-on-surface-variant">{subject.code || 'No code'}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-outline-variant/50">
                <span className="text-[11px] text-on-surface-variant">
                  {subject.semester ? `Semester ${subject.semester}` : 'Current'}
                </span>
                <button className="text-primary text-[12px] font-medium hover:underline flex items-center gap-1">
                  <span>View</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
