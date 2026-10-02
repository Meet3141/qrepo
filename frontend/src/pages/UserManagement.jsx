import React, { useCallback, useEffect, useState } from 'react';
import { departmentsApi, usersApi } from '../api/platform';
import { notifyError } from '../api/errors';
import {
  ConfirmDialog, LoadError, Dialog, Field, inputClass, primaryButton, secondaryButton,
} from '../components/ui';
import { toast } from '../components/Toast';

const PAGE_SIZE = 20;
const EMPTY_FORM = { email: '', full_name: '', password: '', role: 'Faculty', department_id: '', is_active: true };

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const [editing, setEditing] = useState(null); // null = closed, {} = new, user = edit
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Debounce the search box
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchTerm.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const load = useCallback(async () => {
    setFailed(false);
    setLoading(true);
    try {
      const params = { page, page_size: PAGE_SIZE };
      if (search) params.search = search;
      if (roleFilter !== 'All') params.role = roleFilter;
      if (statusFilter !== 'All') params.is_active = statusFilter === 'Active';
      const result = await usersApi.list(params);
      setUsers(result.items);
      setTotal(result.total);
    } catch (err) {
      setFailed(true);
      notifyError(err, 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    usersApi.roles().then(setRoles).catch(() => {});
    departmentsApi.list().then(setDepartments).catch(() => {});
  }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditing({});
  };

  const openEdit = (user) => {
    setForm({
      email: user.email, full_name: user.full_name || '', password: '', role: user.role?.name || '',
      department_id: user.department?.id || '', is_active: user.is_active,
    });
    setEditing(user);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const isNew = !editing.id;
    if (isNew && (!form.email.trim() || !form.password)) {
      toast.error('Email and password are required.');
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        await usersApi.create({
          email: form.email.trim(), password: form.password, full_name: form.full_name || null, role: form.role,
          department_id: form.department_id || null, is_active: form.is_active,
        });
        toast.success(`User ${form.email.trim()} created.`);
      } else {
        const body = { full_name: form.full_name, role: form.role, department_id: form.department_id || null,
                       is_active: form.is_active };
        if (form.password) body.password = form.password;
        await usersApi.update(editing.id, body);
        toast.success(`User ${editing.email} updated.`);
      }
      setEditing(null);
      await load();
    } catch (err) {
      notifyError(err, 'Saving failed.');
    } finally {
      setSaving(false);
    }
  };

  const [togglingId, setTogglingId] = useState(null);
  const toggleActive = async (user) => {
    if (togglingId) return;
    setTogglingId(user.id);
    try {
      await usersApi.update(user.id, { is_active: !user.is_active });
      toast.success(`${user.email} ${user.is_active ? 'suspended' : 'reactivated'}.`);
      await load();
    } catch (err) {
      notifyError(err);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await usersApi.remove(deleteTarget.id);
      toast.success(`User ${deleteTarget.email} deleted.`);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      notifyError(err, 'Delete failed.');
    } finally {
      setDeleting(false);
    }
  };

  const exportCsv = async () => {
    try { await usersApi.exportCsv(); } catch (err) { notifyError(err, 'Export failed.'); }
  };

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Page Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-on-surface">User Management</h1>
          <p className="text-[13px] text-on-surface-variant mt-1">Create accounts, assign roles and departments, and suspend access.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={exportCsv} className={secondaryButton}>
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export CSV
          </button>
          <button onClick={openCreate} className={primaryButton}>
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Add User
          </button>
        </div>
      </div>
      {failed && <LoadError what="users" onRetry={load} />}

      {/* Filters */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-end">
        <div className="w-full md:w-auto flex-1">
          <label className="block font-medium text-[11px] text-secondary mb-1">Search Users</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
            <input
              className="w-full h-9 pl-9 pr-4 bg-surface border border-outline-variant rounded-lg text-[13px] text-on-surface focus:border-primary outline-none transition-all placeholder:text-outline"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="block font-medium text-[11px] text-secondary mb-1">Role</label>
          <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                  className="h-9 px-3 bg-surface border border-outline-variant rounded-lg text-[13px] text-on-surface outline-none focus:border-primary">
            <option value="All">All Roles</option>
            {roles.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block font-medium text-[11px] text-secondary mb-1">Status</label>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  className="h-9 px-3 bg-surface border border-outline-variant rounded-lg text-[13px] text-on-surface outline-none focus:border-primary">
            <option value="All">All</option>
            <option value="Active">Active</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-surface-container border-b border-outline-variant">
                <th className="p-3 text-[11px] text-secondary font-semibold uppercase tracking-wider">User</th>
                <th className="p-3 text-[11px] text-secondary font-semibold uppercase tracking-wider">Role</th>
                <th className="p-3 text-[11px] text-secondary font-semibold uppercase tracking-wider hidden md:table-cell">Department</th>
                <th className="p-3 text-[11px] text-secondary font-semibold uppercase tracking-wider">Status</th>
                <th className="p-3 text-[11px] text-secondary font-semibold uppercase tracking-wider hidden md:table-cell">Created</th>
                <th className="p-3 text-[11px] text-secondary font-semibold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant text-[13px]">
              {loading ? (
                <tr><td colSpan="6" className="p-6 text-center text-secondary">Loading users...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="6" className="p-6 text-center text-secondary">No users match these filters.</td></tr>
              ) : users.map((user) => (
                <tr key={user.id} className="hover:bg-surface-container-low transition-colors group">
                  <td className="p-3">
                    <div className="text-on-surface font-medium">{user.full_name || '—'}</div>
                    <div className="text-[12px] text-secondary">{user.email}</div>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-1 rounded-full text-[11px] font-medium bg-secondary-container text-on-secondary-container">
                      {user.role?.name || 'None'}
                    </span>
                  </td>
                  <td className="p-3 text-secondary hidden md:table-cell">{user.department?.name || '—'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-[11px] font-medium ${user.is_active ? 'bg-primary-container text-on-primary-container' : 'bg-error-container text-on-error-container'}`}>
                      {user.is_active ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="p-3 text-secondary hidden md:table-cell">{new Date(user.created_at).toLocaleDateString()}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(user)} className="p-1 text-secondary hover:text-primary transition-colors rounded hover:bg-surface-container" title="Edit">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button onClick={() => toggleActive(user)} disabled={togglingId === user.id} className="disabled:opacity-50 p-1 text-secondary hover:text-on-surface transition-colors rounded hover:bg-surface-container"
                              title={user.is_active ? 'Suspend' : 'Reactivate'}>
                        <span className="material-symbols-outlined text-[18px]">{user.is_active ? 'block' : 'check_circle'}</span>
                      </button>
                      <button onClick={() => setDeleteTarget(user)} className="p-1 text-secondary hover:text-error transition-colors rounded hover:bg-error-container/30" title="Delete">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Footer / pagination */}
        <div className="bg-surface-container-lowest border-t border-outline-variant px-4 py-2 flex items-center justify-between">
          <span className="text-[12px] text-secondary">
            {total === 0 ? 'No users' : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total} users`}
          </span>
          <div className="flex gap-1">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 rounded border border-outline-variant text-secondary text-xs disabled:opacity-50">Previous</button>
            <span className="px-3 py-1 text-xs text-secondary">Page {page} of {pages}</span>
            <button disabled={page >= pages} onClick={() => setPage(page + 1)} className="px-3 py-1 rounded border border-outline-variant text-secondary text-xs disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      {/* Add / Edit dialog */}
      {editing && (
        <Dialog title={editing.id ? `Edit ${editing.email}` : 'Add User'} onClose={() => setEditing(null)}>
          <form onSubmit={handleSave} className="p-4 flex flex-col gap-4">
            <Field label="Email *">
              <input type="email" className={inputClass} value={form.email} disabled={!!editing.id}
                     onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </Field>
            <Field label="Full name">
              <input className={inputClass} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </Field>
            <Field label={editing.id ? 'New password' : 'Password *'}
                   hint={`At least 8 characters with a letter, a number and a symbol (@$!%*#?&).${editing.id ? ' Leave blank to keep the current password.' : ''}`}>
              <input type="password" className={inputClass} value={form.password} autoComplete="new-password"
                     onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing.id} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Role *">
                <select className={inputClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {roles.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select>
              </Field>
              <Field label="Department">
                <select className={inputClass} value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                  <option value="">None</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
                </select>
              </Field>
            </div>
            <label className="flex items-center gap-2 text-[13px] text-on-surface">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Account active
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditing(null)} className={secondaryButton}>Cancel</button>
              <button type="submit" disabled={saving} className={primaryButton}>
                {saving ? 'Saving...' : editing.id ? 'Save changes' : 'Create user'}
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete User"
          message={<>Permanently delete <strong>{deleteTarget.email}</strong>? Users with existing academic records cannot be deleted — suspend them instead.</>}
          confirmLabel="Delete"
          busy={deleting}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
