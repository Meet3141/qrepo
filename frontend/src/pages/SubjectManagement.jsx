import React, { useCallback, useEffect, useState } from 'react';
import { subjectService } from '../api/subjects';
import { unitService } from '../api/units';
import { facultyApi } from '../api/platform';
import { notifyError } from '../api/errors';
import { ROLES } from '../api/session';
import { useSession } from '../components/Session';
import { toast } from '../components/Toast';
import {
  ConfirmDialog, Dialog, Field, LoadError, inputClass, primaryButton, secondaryButton, textareaClass,
} from '../components/ui';

const EMPTY_SUBJECT = { name: '', code: '', description: '', faculty_id: '' };
const EMPTY_UNIT = { unit_number: '', title: '', description: '' };

export default function SubjectManagement() {
  const { user, role } = useSession();
  // Backend: subjects are managed by Admin/HOD; units also by the subject's assigned Faculty
  const canManageSubjects = role === ROLES.ADMIN || role === ROLES.HOD;
  const canManageUnits = (subject) => canManageSubjects || (role === ROLES.FACULTY && user && subject.faculty_id === user.id);

  const [subjects, setSubjects] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expanded, setExpanded] = useState(null);

  // Subject dialog
  const [editingSubject, setEditingSubject] = useState(null); // null = closed, {} = new
  const [formData, setFormData] = useState(EMPTY_SUBJECT);
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSubjects = useCallback(async () => {
    setFailed(false);
    try {
      setSubjects(await subjectService.getSubjects());
    } catch (err) {
      setFailed(true);
      notifyError(err, 'Failed to load subjects.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSubjects(); }, [fetchSubjects]);

  // Faculty for the "assigned faculty" picker (Admin: all; HOD: their departments)
  useEffect(() => {
    if (!canManageSubjects) return;
    facultyApi.list().then((res) => setFaculty(res.items)).catch((err) => notifyError(err, 'Could not load the faculty list.'));
  }, [canManageSubjects]);

  const facultyName = (id) => {
    if (!id) return '—';
    if (user && id === user.id) return 'You';
    const f = faculty.find((x) => x.id === id);
    return f ? f.full_name || f.email : 'Assigned';
  };

  const term = searchTerm.toLowerCase();
  const filtered = subjects.filter((s) => s.name?.toLowerCase().includes(term) || s.code?.toLowerCase().includes(term));

  const openSubject = (subject) => {
    setEditingSubject(subject || {});
    setFormData(subject
      ? { name: subject.name, code: subject.code, description: subject.description || '', faculty_id: subject.faculty_id || '' }
      : EMPTY_SUBJECT);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const body = {
      name: formData.name.trim(),
      code: formData.code.trim(),
      description: formData.description.trim() || null,
      faculty_id: formData.faculty_id || null,
    };
    if (!body.name || !body.code) return toast.error('Subject name and code are required.');
    setSubmitting(true);
    try {
      if (editingSubject.id) {
        await subjectService.updateSubject(editingSubject.id, body);
        toast.success(`Subject ${body.code} updated.`);
      } else {
        await subjectService.createSubject(body);
        toast.success(`Subject ${body.code} created.`);
      }
      setEditingSubject(null);
      await fetchSubjects();
    } catch (err) {
      notifyError(err, 'Saving the subject failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await subjectService.deleteSubject(deleteTarget.id);
      toast.success(`Subject ${deleteTarget.code} deleted.`);
      if (expanded === deleteTarget.id) setExpanded(null);
      setDeleteTarget(null);
      await fetchSubjects();
    } catch (err) {
      notifyError(err, 'Delete failed.');
    } finally {
      setDeleting(false);
    }
  };

  const columns = canManageSubjects ? 5 : 4;

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Page Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-on-surface">Subject Management</h1>
          <p className="text-[13px] text-on-surface-variant mt-1">Manage curriculum subjects, their units and the faculty assigned to them.</p>
        </div>
        {canManageSubjects && (
          <button onClick={() => openSubject(null)} className="bg-primary text-on-primary py-2 px-4 rounded-lg font-medium text-[13px] flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm shrink-0">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add Subject
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-end">
        <label className="w-full md:w-auto flex-1">
          <span className="block font-medium text-[11px] text-secondary mb-1">Search Subjects</span>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
            <input
              className="w-full h-9 pl-9 pr-4 bg-surface border border-outline-variant rounded-lg text-[13px] text-on-surface focus:border-primary outline-none transition-all placeholder:text-outline"
              placeholder="Search by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </label>
      </div>

      {failed && <LoadError what="subjects" onRetry={fetchSubjects} />}

      {/* Data Table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-surface-container border-b border-outline-variant">
                <th className="p-3 w-10" aria-label="Units" />
                <th className="p-3 text-[11px] text-secondary font-semibold uppercase tracking-wider">Code</th>
                <th className="p-3 text-[11px] text-secondary font-semibold uppercase tracking-wider">Name</th>
                <th className="p-3 text-[11px] text-secondary font-semibold uppercase tracking-wider hidden md:table-cell">Assigned Faculty</th>
                {canManageSubjects && <th className="p-3 text-[11px] text-secondary font-semibold uppercase tracking-wider text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant text-[13px]">
              {loading ? (
                <tr><td colSpan={columns} className="p-6 text-center text-secondary">Loading subjects...</td></tr>
              ) : filtered.length > 0 ? (
                filtered.map((subject) => (
                  <React.Fragment key={subject.id}>
                    <tr className="hover:bg-surface-container-low transition-colors group">
                      <td className="p-3">
                        <button
                          onClick={() => setExpanded(expanded === subject.id ? null : subject.id)}
                          className="p-1 text-secondary hover:text-primary rounded"
                          aria-expanded={expanded === subject.id}
                          aria-label={`${expanded === subject.id ? 'Hide' : 'Show'} units of ${subject.code}`}
                        >
                          <span className="material-symbols-outlined text-[18px]">{expanded === subject.id ? 'expand_less' : 'expand_more'}</span>
                        </button>
                      </td>
                      <td className="p-3 font-semibold text-on-surface">{subject.code}</td>
                      <td className="p-3 text-on-surface">
                        {subject.name}
                        {subject.description && <span className="block text-[11px] text-secondary truncate max-w-[320px]">{subject.description}</span>}
                      </td>
                      <td className="p-3 text-secondary hidden md:table-cell">{facultyName(subject.faculty_id)}</td>
                      {canManageSubjects && (
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            <button onClick={() => openSubject(subject)} className="p-1 text-secondary hover:text-primary transition-colors rounded hover:bg-surface-container" title="Edit" aria-label={`Edit ${subject.code}`}>
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button onClick={() => setDeleteTarget(subject)} className="p-1 text-secondary hover:text-error transition-colors rounded hover:bg-error-container/30" title="Delete" aria-label={`Delete ${subject.code}`}>
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                    {expanded === subject.id && (
                      <tr>
                        <td colSpan={columns} className="p-0 bg-surface-container/30">
                          <UnitsPanel subject={subject} canManage={canManageUnits(subject)} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr><td colSpan={columns} className="p-6 text-center text-secondary">
                  {searchTerm ? 'No subjects match your search.' : failed ? '—' : 'No subjects yet.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-surface-container-lowest border-t border-outline-variant px-4 py-2 flex items-center justify-between">
          <span className="text-[12px] text-secondary">Showing {filtered.length} of {subjects.length} subjects</span>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      {editingSubject && (
        <Dialog title={editingSubject.id ? 'Edit Subject' : 'Add Subject'} onClose={() => setEditingSubject(null)}>
          <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
            <Field label="Subject Code *">
              <input className={inputClass} value={formData.code} maxLength={50} required placeholder="e.g. CS101"
                     onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
            </Field>
            <Field label="Subject Name *">
              <input className={inputClass} value={formData.name} maxLength={255} required placeholder="e.g. Introduction to Computer Science"
                     onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </Field>
            <Field label="Assigned Faculty" hint="The assigned faculty member can manage this subject's units and generate questions for it.">
              <select className={inputClass} value={formData.faculty_id} onChange={(e) => setFormData({ ...formData, faculty_id: e.target.value })}>
                <option value="">Not assigned</option>
                {faculty.filter((f) => f.is_active || f.id === formData.faculty_id).map((f) => (
                  <option key={f.id} value={f.id}>{f.full_name || f.email}{f.department_name ? ` — ${f.department_name}` : ''}</option>
                ))}
              </select>
            </Field>
            <Field label="Description">
              <textarea className={`${textareaClass} h-24`} value={formData.description} maxLength={500} placeholder="Optional description..."
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditingSubject(null)} className={secondaryButton}>Cancel</button>
              <button type="submit" disabled={submitting} className={primaryButton}>
                {submitting ? 'Saving...' : editingSubject.id ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Subject"
          message={<>Delete <strong>{deleteTarget.name}</strong> ({deleteTarget.code}) together with its units, documents, AI-generated questions and papers? This cannot be undone.</>}
          confirmLabel="Delete"
          busy={deleting}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

/** Units of one subject: GET/POST /subjects/{id}/units, PUT/DELETE /units/{id}. */
function UnitsPanel({ subject, canManage }) {
  const [units, setUnits] = useState(null);
  const [editing, setEditing] = useState(null); // null = closed, {} = new
  const [form, setForm] = useState(EMPTY_UNIT);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await unitService.getUnitsBySubject(subject.id);
      setUnits([...list].sort((a, b) => a.unit_number - b.unit_number));
    } catch (err) {
      setUnits([]);
      notifyError(err, 'Failed to load units.');
    }
  }, [subject.id]);

  useEffect(() => { load(); }, [load]);

  const open = (unit) => {
    const next = units?.length ? Math.max(...units.map((u) => u.unit_number)) + 1 : 1;
    setEditing(unit || {});
    setForm(unit ? { unit_number: unit.unit_number, title: unit.title, description: unit.description || '' }
                 : { ...EMPTY_UNIT, unit_number: next });
  };

  const save = async (e) => {
    e.preventDefault();
    const body = { unit_number: Number(form.unit_number), title: form.title.trim(), description: form.description.trim() || null };
    if (!body.title || !Number.isInteger(body.unit_number) || body.unit_number < 1) {
      return toast.error('Enter a unit number (1 or more) and a title.');
    }
    setSaving(true);
    try {
      if (editing.id) await unitService.updateUnit(editing.id, body);
      else await unitService.createUnit(subject.id, body);
      toast.success(`Unit ${body.unit_number} ${editing.id ? 'updated' : 'added'}.`);
      setEditing(null);
      await load();
    } catch (err) {
      notifyError(err, 'Saving the unit failed.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await unitService.deleteUnit(deleteTarget.id);
      toast.success(`Unit ${deleteTarget.unit_number} deleted.`);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      notifyError(err, 'Delete failed.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="px-6 py-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[12px] font-semibold text-secondary uppercase tracking-wider">Units of {subject.code}</h3>
        {canManage && (
          <button onClick={() => open(null)} className="text-primary text-[12px] font-semibold hover:underline flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">add</span>
            Add Unit
          </button>
        )}
      </div>
      {units === null ? (
        <p className="text-[12px] text-secondary">Loading units...</p>
      ) : units.length === 0 ? (
        <p className="text-[12px] text-on-surface-variant">No units yet.{canManage ? ' Add one so documents can be uploaded for it.' : ''}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {units.map((u) => (
            <li key={u.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/60">
              <span className="text-[12px] font-bold text-primary w-14 shrink-0">Unit {u.unit_number}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-on-surface">{u.title}</p>
                {u.description && <p className="text-[11px] text-secondary">{u.description}</p>}
              </div>
              {canManage && (
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => open(u)} className="p-1 text-secondary hover:text-primary rounded" aria-label={`Edit unit ${u.unit_number}`}>
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                  <button onClick={() => setDeleteTarget(u)} className="p-1 text-secondary hover:text-error rounded" aria-label={`Delete unit ${u.unit_number}`}>
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <Dialog title={editing.id ? `Edit Unit ${editing.unit_number}` : `Add Unit to ${subject.code}`} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="p-4 flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Number *">
                <input type="number" min="1" className={inputClass} value={form.unit_number} required
                       onChange={(e) => setForm({ ...form, unit_number: e.target.value })} />
              </Field>
              <div className="col-span-2">
                <Field label="Title *">
                  <input className={inputClass} value={form.title} maxLength={255} required placeholder="e.g. Sorting and Searching"
                         onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </Field>
              </div>
            </div>
            <Field label="Description">
              <textarea className={`${textareaClass} h-20`} value={form.description} maxLength={500}
                        onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className={secondaryButton}>Cancel</button>
              <button type="submit" disabled={saving} className={primaryButton}>{saving ? 'Saving...' : editing.id ? 'Update' : 'Add unit'}</button>
            </div>
          </form>
        </Dialog>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Unit"
          message={<>Delete Unit {deleteTarget.unit_number}: <strong>{deleteTarget.title}</strong> and its documents? This cannot be undone.</>}
          confirmLabel="Delete"
          busy={deleting}
          onConfirm={remove}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
