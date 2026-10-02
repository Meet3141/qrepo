import React, { useState } from 'react';

// Static demo data — backend does not have user management CRUD endpoints
const DEMO_USERS = [
  { id: '1', email: 'admin@test.com', is_active: true, role: { id: 1, name: 'Admin' }, created_at: '2024-01-15T10:00:00Z' },
  { id: '2', email: 'hod@test.com', is_active: true, role: { id: 2, name: 'HOD' }, created_at: '2024-02-01T10:00:00Z' },
  { id: '3', email: 'faculty@test.com', is_active: true, role: { id: 3, name: 'Faculty' }, created_at: '2024-03-10T10:00:00Z' },
  { id: '4', email: 'student@test.com', is_active: true, role: { id: 4, name: 'Student' }, created_at: '2024-04-20T10:00:00Z' },
  { id: '5', email: 'inactive.user@test.com', is_active: false, role: { id: 4, name: 'Student' }, created_at: '2024-05-05T10:00:00Z' },
];

const DEMO_ROLES = [
  { id: 1, name: 'Admin' },
  { id: 2, name: 'HOD' },
  { id: 3, name: 'Faculty' },
  { id: 4, name: 'Student' },
];

export default function UserManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  const filtered = DEMO_USERS.filter(u => {
    const matchesSearch = u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'All' || u.role?.name === roleFilter;
    return matchesSearch && matchesRole;
  });

  const showUnavailable = () => {
    alert('This feature requires admin user management API endpoints that are not yet available in the backend. Users can currently register via the login page.');
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* API Unavailable Banner */}
      <div className="bg-secondary-container text-on-secondary-container rounded-xl p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-[20px] mt-0.5 shrink-0">info</span>
        <div>
          <p className="text-sm font-medium">Demo Mode — Admin user management API endpoints are not yet available.</p>
          <p className="text-xs mt-1 opacity-80">User creation is available through the public registration endpoint. The data below is for demonstration purposes only.</p>
        </div>
      </div>

      {/* Page Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-on-surface">User Management</h1>
          <p className="text-[13px] text-on-surface-variant mt-1">View and manage platform user accounts.</p>
        </div>
        <button onClick={showUnavailable} className="bg-primary text-on-primary py-2 px-4 rounded-lg font-medium text-[13px] flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm shrink-0 opacity-60 cursor-not-allowed">
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-end">
        <div className="w-full md:w-auto flex-1">
          <label className="block font-medium text-[11px] text-secondary mb-1">Search Users</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
            <input
              className="w-full h-9 pl-9 pr-4 bg-surface border border-outline-variant rounded-lg text-[13px] text-on-surface focus:border-primary outline-none transition-all placeholder:text-outline"
              placeholder="Search by email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="block font-medium text-[11px] text-secondary mb-1">Role Filter</label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-9 px-3 bg-surface border border-outline-variant rounded-lg text-[13px] text-on-surface outline-none focus:border-primary"
          >
            <option value="All">All Roles</option>
            {DEMO_ROLES.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-surface-container border-b border-outline-variant">
                <th className="p-3 text-[11px] text-secondary font-semibold uppercase tracking-wider">Email</th>
                <th className="p-3 text-[11px] text-secondary font-semibold uppercase tracking-wider">Role</th>
                <th className="p-3 text-[11px] text-secondary font-semibold uppercase tracking-wider">Status</th>
                <th className="p-3 text-[11px] text-secondary font-semibold uppercase tracking-wider hidden md:table-cell">Created</th>
                <th className="p-3 text-[11px] text-secondary font-semibold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant text-[13px]">
              {filtered.map((user) => (
                <tr key={user.id} className="hover:bg-surface-container-low transition-colors group">
                  <td className="p-3 text-on-surface">{user.email}</td>
                  <td className="p-3">
                    <span className="px-2 py-1 rounded-full text-[11px] font-medium bg-secondary-container text-on-secondary-container">
                      {user.role?.name || 'None'}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-[11px] font-medium ${user.is_active ? 'bg-primary-container text-on-primary-container' : 'bg-error-container text-on-error-container'}`}>
                      {user.is_active ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="p-3 text-secondary hidden md:table-cell">{new Date(user.created_at).toLocaleDateString()}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={showUnavailable} className="p-1 text-secondary hover:text-primary transition-colors rounded hover:bg-surface-container opacity-50 cursor-not-allowed" title="Edit (Unavailable)">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button onClick={showUnavailable} className="p-1 text-secondary hover:text-error transition-colors rounded hover:bg-error-container/30 opacity-50 cursor-not-allowed" title="Delete (Unavailable)">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Footer */}
        <div className="bg-surface-container-lowest border-t border-outline-variant px-4 py-2 flex items-center justify-between">
          <span className="text-[12px] text-secondary">
            Showing {filtered.length} of {DEMO_USERS.length} users (demo data)
          </span>
        </div>
      </div>
    </div>
  );
}
