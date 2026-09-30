import React, { useState } from 'react';

export default function HodFacultyManagement() {
  const [faculties, setFaculties] = useState([
    { id: 1, name: 'Dr. Alan Turing', email: 'alan@qrepo.edu', role: 'Senior Professor', status: 'Active', subjects: 4, performance: 'Excellent' },
    { id: 2, name: 'Prof. Sarah Parker', email: 'sarah@qrepo.edu', role: 'Associate Professor', status: 'Active', subjects: 3, performance: 'Good' },
    { id: 3, name: 'Dr. Nikola Tesla', email: 'nikola@qrepo.edu', role: 'Professor', status: 'On Leave', subjects: 2, performance: 'N/A' },
    { id: 4, name: 'Prof. Robert Bridge', email: 'robert@qrepo.edu', role: 'Assistant Professor', status: 'Active', subjects: 5, performance: 'Average' },
  ]);

  return (
    <div className="flex-1 p-margin-mobile md:p-gutter max-w-container-max mx-auto w-full flex flex-col gap-6 h-full overflow-y-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-on-surface">Faculty Management</h2>
          <p className="text-sm text-on-surface-variant mt-1">Manage department faculty, assignments, and performance.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => alert('Export report (demo — no export API in backend)')} className="bg-surface-container-lowest border border-outline-variant text-secondary text-sm font-medium px-4 py-2 rounded hover:bg-surface-container-low transition-colors shadow-sm">
            Export Report
          </button>
          <button onClick={() => alert('Add Faculty (demo — uses the User Management API with Faculty role)')} className="bg-primary text-on-primary text-sm font-medium px-4 py-2 rounded hover:bg-primary-container transition-colors shadow-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Add Faculty
          </button>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm flex flex-col overflow-hidden min-h-[500px]">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-outline-variant bg-surface-bright flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="relative w-full sm:w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
            <input 
              className="w-full pl-9 pr-4 h-9 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
              placeholder="Search faculty..." 
              type="text"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-outline-variant text-on-surface-variant text-sm font-medium hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-[16px]">filter_list</span>
              Filter
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-bright sticky top-0 z-10 border-b border-outline-variant">
              <tr>
                <th className="p-4 text-xs font-semibold text-secondary uppercase tracking-wider">Faculty Name</th>
                <th className="p-4 text-xs font-semibold text-secondary uppercase tracking-wider">Contact</th>
                <th className="p-4 text-xs font-semibold text-secondary uppercase tracking-wider">Role</th>
                <th className="p-4 text-xs font-semibold text-secondary uppercase tracking-wider text-center">Subjects Assigned</th>
                <th className="p-4 text-xs font-semibold text-secondary uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-semibold text-secondary uppercase tracking-wider">Performance</th>
                <th className="p-4 w-12 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm text-on-surface">
              {faculties.map((f, i) => (
                <tr key={f.id} className="hover:bg-surface-container-low transition-colors group cursor-pointer border-b border-outline-variant/50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-fixed-dim flex items-center justify-center text-xs font-bold text-primary">
                        {f.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                      </div>
                      <span className="font-semibold">{f.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-secondary">{f.email}</td>
                  <td className="p-4">{f.role}</td>
                  <td className="p-4 text-center">
                    <span className="bg-secondary-container text-on-secondary-container px-2 py-1 rounded-md text-xs font-semibold">
                      {f.subjects}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${f.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-surface-variant text-on-surface-variant'}`}>
                      {f.status}
                    </span>
                  </td>
                  <td className="p-4 text-secondary">
                     {f.performance}
                  </td>
                  <td className="p-4 text-center">
                    <button onClick={() => alert(`Actions for ${f.name} (demo — faculty actions not yet implemented in backend)`)} className="text-outline hover:text-primary transition-colors opacity-0 group-hover:opacity-100 p-1">
                      <span className="material-symbols-outlined text-[20px]">more_vert</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        <div className="p-4 border-t border-outline-variant bg-surface-bright flex justify-between items-center">
          <span className="text-xs text-secondary font-medium">Showing 1 to {faculties.length} of {faculties.length} entries</span>
          <div className="flex items-center gap-1">
            <button className="p-1 rounded text-outline hover:bg-surface-container hover:text-on-surface transition-colors disabled:opacity-50" disabled>
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button className="px-3 py-1 rounded bg-primary text-on-primary text-xs font-medium">1</button>
            <button className="p-1 rounded text-outline hover:bg-surface-container hover:text-on-surface transition-colors disabled:opacity-50" disabled>
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
