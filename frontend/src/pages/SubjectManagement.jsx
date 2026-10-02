import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export default function SubjectManagement() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [formData, setFormData] = useState({ name: '', code: '', description: '' });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  useEffect(() => { fetchSubjects(); }, []);

  const filtered = subjects.filter(s =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Open add modal
  const handleAdd = () => {
    setEditingSubject(null);
    setFormData({ name: '', code: '', description: '' });
    setFormError('');
    setShowModal(true);
  };

  // Open edit modal
  const handleEdit = (subject) => {
    setEditingSubject(subject);
    setFormData({ name: subject.name, code: subject.code, description: subject.description || '' });
    setFormError('');
    setShowModal(true);
  };

  // Submit (create or update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      setFormError('Name and Code are required.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      if (editingSubject) {
        await apiClient.put(`/subjects/${editingSubject.id}`, formData);
      } else {
        await apiClient.post('/subjects', formData);
      }
      setShowModal(false);
      setEditingSubject(null);
      await fetchSubjects();
    } catch (err) {
      setFormError(err.response?.data?.message || err.response?.data?.detail || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/subjects/${deleteTarget.id}`);
      setDeleteTarget(null);
      await fetchSubjects();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Page Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-on-surface">Subject Management</h1>
          <p className="text-[13px] text-on-surface-variant mt-1">Manage curriculum subjects, assign codes, and track credits.</p>
        </div>
        <button onClick={handleAdd} className="bg-primary text-on-primary py-2 px-4 rounded-lg font-medium text-[13px] flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm shrink-0">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add Subject
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-end">
        <div className="w-full md:w-auto flex-1">
          <label className="block font-medium text-[11px] text-secondary mb-1">Search Subjects</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
            <input
              className="w-full h-9 pl-9 pr-4 bg-surface border border-outline-variant rounded-lg text-[13px] text-on-surface focus:border-primary outline-none transition-all placeholder:text-outline"
              placeholder="Search by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-surface-container border-b border-outline-variant">
                <th className="p-3 text-[11px] text-secondary font-semibold uppercase tracking-wider">Code</th>
                <th className="p-3 text-[11px] text-secondary font-semibold uppercase tracking-wider">Name</th>
                <th className="p-3 text-[11px] text-secondary font-semibold uppercase tracking-wider hidden md:table-cell">Description</th>
                <th className="p-3 text-[11px] text-secondary font-semibold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant text-[13px]">
              {loading ? (
                <tr><td colSpan="4" className="p-6 text-center text-secondary">Loading subjects...</td></tr>
              ) : filtered.length > 0 ? (
                filtered.map((subject) => (
                  <tr key={subject.id} className="hover:bg-surface-container-low transition-colors group">
                    <td className="p-3 font-semibold text-on-surface">{subject.code}</td>
                    <td className="p-3 text-on-surface">{subject.name}</td>
                    <td className="p-3 text-secondary hidden md:table-cell truncate max-w-[200px]">{subject.description || '—'}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(subject)} className="p-1 text-secondary hover:text-primary transition-colors rounded hover:bg-surface-container" title="Edit">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button onClick={() => setDeleteTarget(subject)} className="p-1 text-secondary hover:text-error transition-colors rounded hover:bg-error-container/30" title="Delete">
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="4" className="p-6 text-center text-secondary">No subjects found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="bg-surface-container-lowest border-t border-outline-variant px-4 py-2 flex items-center justify-between">
          <span className="text-[12px] text-secondary">
            Showing {filtered.length} of {subjects.length} subjects
          </span>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-outline-variant">
              <h3 className="text-[15px] font-semibold text-on-surface">{editingSubject ? 'Edit Subject' : 'Add Subject'}</h3>
              <button onClick={() => setShowModal(false)} className="text-on-surface-variant hover:text-on-surface p-1 rounded-full">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
              {formError && (
                <div className="p-3 bg-error-container text-on-error-container text-[12px] rounded-lg">{formError}</div>
              )}
              <div>
                <label className="block text-[11px] font-semibold text-on-surface mb-1">Subject Code *</label>
                <input
                  className="w-full h-10 px-3 bg-surface-container-high border border-outline rounded-lg text-sm text-on-surface focus:border-primary outline-none transition-colors placeholder:text-outline"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. CS101"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-on-surface mb-1">Subject Name *</label>
                <input
                  className="w-full h-10 px-3 bg-surface-container-high border border-outline rounded-lg text-sm text-on-surface focus:border-primary outline-none transition-colors placeholder:text-outline"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Introduction to Computer Science"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-on-surface mb-1">Description</label>
                <textarea
                  className="w-full h-24 px-3 py-2 bg-surface-container-high border border-outline rounded-lg text-sm text-on-surface focus:border-primary outline-none transition-colors resize-none placeholder:text-outline"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-[13px] text-secondary border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-4 py-2 text-[13px] bg-primary text-on-primary rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-wait">
                  {submitting ? 'Saving...' : editingSubject ? 'Update' : 'Create'}
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
                <h3 className="text-[15px] font-semibold text-on-surface">Delete Subject</h3>
                <p className="text-[12px] text-on-surface-variant">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-[13px] text-on-surface mb-6">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong> ({deleteTarget.code})?
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
