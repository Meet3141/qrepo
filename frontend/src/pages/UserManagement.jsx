import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ email: '', password: '', role_id: '' });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = async () => {
    try {
      const [usersRes, rolesRes] = await Promise.allSettled([
        apiClient.get('/auth/users'),
        apiClient.get('/auth/roles'),
      ]);
      if (usersRes.status === 'fulfilled') setUsers(usersRes.value.data.data || []);
      if (rolesRes.status === 'fulfilled') setRoles(rolesRes.value.data.data || []);
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = users.filter(u => {
    const matchesSearch = u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'All' || u.role?.name === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Open add modal
  const handleAdd = () => {
    setEditingUser(null);
    setFormData({ email: '', password: '', role_id: '' });
    setFormError('');
    setShowModal(true);
  };

  // Open edit modal
  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({ email: user.email, password: '', role_id: user.role?.id || '' });
    setFormError('');
    setShowModal(true);
  };

  // Submit create or update
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email.trim()) {
      setFormError('Email is required.');
      return;
    }
    if (!editingUser && !formData.password) {
      setFormError('Password is required for new users.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      if (editingUser) {
        const updatePayload = {};
        if (formData.email !== editingUser.email) updatePayload.email = formData.email;
        if (formData.role_id && formData.role_id !== editingUser.role?.id) updatePayload.role_id = Number(formData.role_id);
        await apiClient.put(`/auth/users/${editingUser.id}`, updatePayload);
      } else {
        const createPayload = {
          email: formData.email,
          password: formData.password,
        };
        if (formData.role_id) createPayload.role_id = Number(formData.role_id);
        await apiClient.post('/auth/users', createPayload);
      }
      setShowModal(false);
      setEditingUser(null);
      await fetchUsers();
    } catch (err) {
      setFormError(err.response?.data?.message || err.response?.data?.detail || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle suspend (is_active)
  const handleToggleSuspend = async (user) => {
    try {
      await apiClient.put(`/auth/users/${user.id}`, { is_active: !user.is_active });
      await fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user status.');
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/auth/users/${deleteTarget.id}`);
      setDeleteTarget(null);
      await fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed.');
    } finally {
      setDeleting(false);
    }
  };

  const getInitials = (email) => email ? email.charAt(0).toUpperCase() : 'U';

  return (
    <div className="w-full flex flex-col xl:flex-row gap-6">
      {/* Left/Main Column */}
      <section className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-on-surface">User Management</h2>
            <p className="text-[13px] text-on-surface-variant mt-1">Manage accounts, roles, and access across QRepo.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="bg-surface-container-lowest text-secondary border border-outline-variant rounded-lg px-3 py-2 text-[13px] font-medium flex items-center gap-1 hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined text-[16px]">filter_list</span>
              Filter
            </button>
            <button onClick={handleAdd} className="bg-primary text-on-primary rounded-lg px-3 py-2 text-[13px] font-medium flex items-center gap-1 hover:bg-primary/90 transition-colors shadow-sm">
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              Add User
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-surface-container-lowest rounded-t-xl border border-outline-variant border-b-0 p-3 flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="relative w-full md:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[18px]">search</span>
            <input
              className="w-full h-9 pl-9 pr-4 bg-surface-container-low border border-transparent rounded-lg text-[13px] text-on-surface focus:border-primary outline-none transition-all placeholder:text-secondary"
              placeholder="Search by email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-9 bg-surface-container-low border border-transparent rounded-lg px-3 text-on-surface focus:border-primary outline-none text-[13px] cursor-pointer"
            >
              <option value="All">Role: All</option>
              {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-surface-container-lowest rounded-b-xl border border-outline-variant overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th className="p-3 text-[11px] text-secondary font-semibold uppercase tracking-wider">Email</th>
                  <th className="p-3 text-[11px] text-secondary font-semibold uppercase tracking-wider w-[15%]">Role</th>
                  <th className="p-3 text-[11px] text-secondary font-semibold uppercase tracking-wider w-[12%]">Status</th>
                  <th className="p-3 text-[11px] text-secondary font-semibold uppercase tracking-wider w-[15%]">Created</th>
                  <th className="p-3 text-[11px] text-secondary font-semibold uppercase tracking-wider text-right w-[12%]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant text-[13px]">
                {loading ? (
                  <tr><td colSpan="5" className="p-6 text-center text-secondary">Loading users...</td></tr>
                ) : filtered.length > 0 ? (
                  filtered.map((user) => (
                    <tr key={user.id} className="hover:bg-surface-container-low transition-colors group">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center text-[11px] font-bold shrink-0">
                            {getInitials(user.email)}
                          </div>
                          <span className="font-medium text-on-surface truncate">{user.email}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-surface-variant text-on-surface-variant text-[11px] font-medium">
                          {user.role?.name || '—'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${user.is_active
                            ? 'bg-primary-fixed text-on-primary-fixed-variant'
                            : 'bg-error-container text-on-error-container'
                          }`}>
                          {user.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="p-3 text-secondary text-[12px]">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEdit(user)} className="p-1 text-secondary hover:text-primary hover:bg-surface-container rounded transition-colors" title="Edit">
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          <button onClick={() => handleToggleSuspend(user)} className="p-1 text-secondary hover:text-error hover:bg-error-container/30 rounded transition-colors" title={user.is_active ? 'Suspend' : 'Activate'}>
                            <span className="material-symbols-outlined text-[16px]">{user.is_active ? 'block' : 'check_circle'}</span>
                          </button>
                          <button onClick={() => setDeleteTarget(user)} className="p-1 text-secondary hover:text-error hover:bg-error-container/30 rounded transition-colors" title="Delete">
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="5" className="p-6 text-center text-secondary">No users found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-outline-variant bg-surface-container-lowest p-3 flex items-center justify-between">
            <span className="text-[12px] text-secondary">Showing {filtered.length} of {users.length} users</span>
          </div>
        </div>
      </section>

      {/* Right Column: Audit Log */}
      <aside className="w-full xl:w-72 flex-shrink-0">
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm flex flex-col overflow-hidden">
          <div className="p-3 border-b border-outline-variant flex items-center gap-2 bg-surface-container-low">
            <span className="material-symbols-outlined text-primary text-[18px]">history</span>
            <h3 className="font-semibold text-[14px] text-on-surface">Audit Log</h3>
          </div>
          <div className="p-3 flex flex-col gap-3 max-h-[400px] overflow-y-auto">
            {[
              { time: '10 mins ago', text: 'Role changed for user', color: 'bg-primary' },
              { time: '2 hrs ago', text: 'Auto-suspended user due to failed logins', color: 'bg-error' },
              { time: 'Yesterday', text: 'Bulk password reset for 12 users', color: 'bg-outline' },
            ].map((log, i) => (
              <div key={i} className="relative pl-5">
                <div className={`absolute w-2 h-2 ${log.color} rounded-full left-0 top-1.5`}></div>
                <span className="text-[10px] text-secondary block">{log.time}</span>
                <p className="text-[12px] text-on-surface">{log.text}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xl " onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-outline-variant">
              <h3 className="text-[15px] font-semibold text-on-surface">{editingUser ? 'Edit User' : 'Add User'}</h3>
              <button onClick={() => setShowModal(false)} className="text-on-surface-variant hover:text-on-surface p-1 rounded-full">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
              {formError && (
                <div className="p-3 bg-error-container text-on-error-container text-[12px] rounded-lg">{formError}</div>
              )}
              <div>
                <label className="block text-[11px] font-semibold text-on-surface mb-1">Email *</label>
                <input
                  type="email"
                  className="w-full h-10 px-3 bg-surface-container-high border border-outline rounded-lg text-sm text-on-surface focus:border-primary outline-none transition-colors placeholder:text-outline"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@qrepo.edu"
                  required
                />
              </div>
              {!editingUser && (
                <div>
                  <label className="block text-[11px] font-semibold text-on-surface mb-1">Password *</label>
                  <input
                    type="password"
                    className="w-full h-10 px-3 bg-surface-container-high border border-outline rounded-lg text-sm text-on-surface focus:border-primary outline-none transition-colors placeholder:text-outline"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Min 8 chars, letter+number+special"
                    required
                  />
                </div>
              )}
              <div>
                <label className="block text-[11px] font-semibold text-on-surface mb-1">Role</label>
                <select
                  className="w-full h-10 px-3 bg-surface-container-high border border-outline rounded-lg text-sm text-on-surface focus:border-primary outline-none transition-colors cursor-pointer"
                  value={formData.role_id}
                  onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                >
                  <option value="">Default (Student)</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-[13px] text-secondary border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-4 py-2 text-[13px] bg-primary text-on-primary rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-wait">
                  {submitting ? 'Saving...' : editingUser ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-error-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-error text-[20px]">warning</span>
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-on-surface">Delete User</h3>
                <p className="text-[12px] text-on-surface-variant">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-[13px] text-on-surface mb-6">
              Are you sure you want to delete <strong>{deleteTarget.email}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-[13px] text-secondary border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 text-[13px] bg-error text-on-error rounded-lg font-medium hover:bg-error/90 transition-colors disabled:opacity-60">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
