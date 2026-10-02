import React, { useCallback, useEffect, useRef, useState } from 'react';
import { subjectService } from '../api/subjects';
import { unitService, unitTopicService } from '../api/units';
import { DOCUMENT_RULES, documentService } from '../api/documents';
import { facultyApi } from '../api/platform';
import { notifyError } from '../api/errors';
import { ROLES } from '../api/session';
import { useSession } from '../components/Session';
import { toast } from '../components/Toast';
import { formatBytes } from '../components/ui';
import {
  ConfirmDialog, Dialog, Field, LoadError, inputClass, primaryButton, secondaryButton, textareaClass,
} from '../components/ui';

const EMPTY_SUBJECT = { name: '', code: '', description: '', faculty_id: '' };
const EMPTY_UNIT = { unit_number: '', title: '', description: '' };
const EMPTY_TOPIC = { title: '', description: '' };

export default function SubjectManagement() {
  const { user, role } = useSession();
  const canManageSubjects = role === ROLES.ADMIN || role === ROLES.HOD;
  const canManageUnits = (subject) => canManageSubjects || (role === ROLES.FACULTY && user && subject.faculty_id === user.id);

  const [subjects, setSubjects] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expanded, setExpanded] = useState(null);

  const [editingSubject, setEditingSubject] = useState(null);
  const [formData, setFormData] = useState(EMPTY_SUBJECT);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSubjects = useCallback(async () => {
    setFailed(false);
    try { setSubjects(await subjectService.getSubjects()); }
    catch (err) { setFailed(true); notifyError(err, 'Failed to load subjects.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSubjects(); }, [fetchSubjects]);

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
    const body = { name: formData.name.trim(), code: formData.code.trim(), description: formData.description.trim() || null, faculty_id: formData.faculty_id || null };
    if (!body.name || !body.code) return toast.error('Subject name and code are required.');
    setSubmitting(true);
    try {
      if (editingSubject.id) { await subjectService.updateSubject(editingSubject.id, body); toast.success(`Subject ${body.code} updated.`); }
      else { await subjectService.createSubject(body); toast.success(`Subject ${body.code} created.`); }
      setEditingSubject(null);
      await fetchSubjects();
    } catch (err) { notifyError(err, 'Saving the subject failed.'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await subjectService.deleteSubject(deleteTarget.id);
      toast.success(`Subject ${deleteTarget.code} deleted.`);
      if (expanded === deleteTarget.id) setExpanded(null);
      setDeleteTarget(null);
      await fetchSubjects();
    } catch (err) { notifyError(err, 'Delete failed.'); }
    finally { setDeleting(false); }
  };

  const columns = canManageSubjects ? 5 : 4;

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-on-surface">Subject Management</h1>
          <p className="text-[13px] text-on-surface-variant mt-1">Manage curriculum subjects, chapters, sub-topics, documents and faculty assignments.</p>
        </div>
        {canManageSubjects && (
          <button onClick={() => openSubject(null)} className="bg-primary text-on-primary py-2 px-4 rounded-lg font-medium text-[13px] flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm shrink-0">
            <span className="material-symbols-outlined text-[18px]">add</span>Add Subject
          </button>
        )}
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-end">
        <label className="w-full md:w-auto flex-1">
          <span className="block font-medium text-[11px] text-secondary mb-1">Search Subjects</span>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
            <input className="w-full h-9 pl-9 pr-4 bg-surface border border-outline-variant rounded-lg text-[13px] text-on-surface focus:border-primary outline-none transition-all placeholder:text-outline"
              placeholder="Search by name or code..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </label>
      </div>

      {failed && <LoadError what="subjects" onRetry={fetchSubjects} />}

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
                        <button onClick={() => setExpanded(expanded === subject.id ? null : subject.id)}
                          className="p-1 text-secondary hover:text-primary rounded"
                          aria-expanded={expanded === subject.id}
                          aria-label={`${expanded === subject.id ? 'Hide' : 'Show'} units of ${subject.code}`}>
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
                            <button onClick={() => openSubject(subject)} className="p-1 text-secondary hover:text-primary transition-colors rounded hover:bg-surface-container" title="Edit">
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button onClick={() => setDeleteTarget(subject)} className="p-1 text-secondary hover:text-error transition-colors rounded hover:bg-error-container/30" title="Delete">
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
          confirmLabel="Delete" busy={deleting} onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}


/** Expanded panel for one subject's units — each unit shows sub-topics + inline document upload. */
function UnitsPanel({ subject, canManage }) {
  const [units, setUnits] = useState(null);
  const [editingUnit, setEditingUnit] = useState(null);
  const [unitForm, setUnitForm] = useState(EMPTY_UNIT);
  const [savingUnit, setSavingUnit] = useState(false);
  const [deleteUnitTarget, setDeleteUnitTarget] = useState(null);
  const [deletingUnit, setDeletingUnit] = useState(false);
  const [expandedUnit, setExpandedUnit] = useState(null); // which unit's details are open

  const loadUnits = useCallback(async () => {
    try {
      const list = await unitService.getUnitsBySubject(subject.id);
      setUnits([...list].sort((a, b) => a.unit_number - b.unit_number));
    } catch (err) {
      setUnits([]);
      notifyError(err, 'Failed to load units.');
    }
  }, [subject.id]);

  useEffect(() => { loadUnits(); }, [loadUnits]);

  const openUnit = (unit) => {
    const next = units?.length ? Math.max(...units.map((u) => u.unit_number)) + 1 : 1;
    setEditingUnit(unit || {});
    setUnitForm(unit
      ? { unit_number: unit.unit_number, title: unit.title, description: unit.description || '' }
      : { ...EMPTY_UNIT, unit_number: next });
  };

  const saveUnit = async (e) => {
    e.preventDefault();
    const body = { unit_number: Number(unitForm.unit_number), title: unitForm.title.trim(), description: unitForm.description.trim() || null };
    if (!body.title || !Number.isInteger(body.unit_number) || body.unit_number < 1) return toast.error('Enter a valid unit number and title.');
    setSavingUnit(true);
    try {
      if (editingUnit.id) await unitService.updateUnit(editingUnit.id, body);
      else await unitService.createUnit(subject.id, body);
      toast.success(`Unit ${body.unit_number} ${editingUnit.id ? 'updated' : 'added'}.`);
      setEditingUnit(null);
      await loadUnits();
    } catch (err) { notifyError(err, 'Saving the unit failed.'); }
    finally { setSavingUnit(false); }
  };

  const removeUnit = async () => {
    setDeletingUnit(true);
    try {
      await unitService.deleteUnit(deleteUnitTarget.id);
      toast.success(`Unit ${deleteUnitTarget.unit_number} deleted.`);
      setDeleteUnitTarget(null);
      if (expandedUnit === deleteUnitTarget.id) setExpandedUnit(null);
      await loadUnits();
    } catch (err) { notifyError(err, 'Delete failed.'); }
    finally { setDeletingUnit(false); }
  };

  return (
    <div className="px-6 py-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[12px] font-semibold text-secondary uppercase tracking-wider">Chapters / Units of {subject.code}</h3>
        {canManage && (
          <button onClick={() => openUnit(null)} className="text-primary text-[12px] font-semibold hover:underline flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">add</span>Add Unit
          </button>
        )}
      </div>

      {units === null ? (
        <p className="text-[12px] text-secondary">Loading units...</p>
      ) : units.length === 0 ? (
        <p className="text-[12px] text-on-surface-variant">No units yet.{canManage ? ' Add a chapter to start uploading documents.' : ''}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {units.map((u) => (
            <li key={u.id} className="rounded-lg bg-surface-container-lowest border border-outline-variant/60 overflow-hidden">
              {/* Unit Row Header */}
              <div className="flex items-center gap-3 p-2.5">
                <button onClick={() => setExpandedUnit(expandedUnit === u.id ? null : u.id)}
                  className="p-0.5 text-secondary hover:text-primary rounded">
                  <span className="material-symbols-outlined text-[16px]">{expandedUnit === u.id ? 'expand_less' : 'expand_more'}</span>
                </button>
                <span className="text-[12px] font-bold text-primary w-14 shrink-0">Unit {u.unit_number}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-on-surface">{u.title}</p>
                  {u.description && <p className="text-[11px] text-secondary">{u.description}</p>}
                  <p className="text-[11px] text-outline mt-0.5">
                    {u.topics?.length || 0} sub-topic{(u.topics?.length || 0) !== 1 ? 's' : ''} · {u.documents?.length || 0} document{(u.documents?.length || 0) !== 1 ? 's' : ''}
                  </p>
                </div>
                {canManage && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openUnit(u)} className="p-1 text-secondary hover:text-primary rounded" title="Edit unit">
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                    <button onClick={() => setDeleteUnitTarget(u)} className="p-1 text-secondary hover:text-error rounded" title="Delete unit">
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Expanded: Sub-topics + Documents */}
              {expandedUnit === u.id && (
                <div className="border-t border-outline-variant/60 grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-outline-variant/40">
                  <SubTopicsPanel unit={u} canManage={canManage} />
                  <DocumentsPanel unit={u} canManage={canManage} onChanged={loadUnits} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {editingUnit && (
        <Dialog title={editingUnit.id ? `Edit Unit ${editingUnit.unit_number}` : `Add Unit to ${subject.code}`} onClose={() => setEditingUnit(null)}>
          <form onSubmit={saveUnit} className="p-4 flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Number *">
                <input type="number" min="1" className={inputClass} value={unitForm.unit_number} required
                       onChange={(e) => setUnitForm({ ...unitForm, unit_number: e.target.value })} />
              </Field>
              <div className="col-span-2">
                <Field label="Title *">
                  <input className={inputClass} value={unitForm.title} maxLength={255} required placeholder="e.g. Sorting and Searching"
                         onChange={(e) => setUnitForm({ ...unitForm, title: e.target.value })} />
                </Field>
              </div>
            </div>
            <Field label="Description">
              <textarea className={`${textareaClass} h-20`} value={unitForm.description} maxLength={500}
                        onChange={(e) => setUnitForm({ ...unitForm, description: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditingUnit(null)} className={secondaryButton}>Cancel</button>
              <button type="submit" disabled={savingUnit} className={primaryButton}>{savingUnit ? 'Saving...' : editingUnit.id ? 'Update' : 'Add Unit'}</button>
            </div>
          </form>
        </Dialog>
      )}

      {deleteUnitTarget && (
        <ConfirmDialog title="Delete Unit"
          message={<>Delete Unit {deleteUnitTarget.unit_number}: <strong>{deleteUnitTarget.title}</strong> and all its sub-topics and documents? This cannot be undone.</>}
          confirmLabel="Delete" busy={deletingUnit} onConfirm={removeUnit} onClose={() => setDeleteUnitTarget(null)} />
      )}
    </div>
  );
}


/** Sub-topics column inside an expanded unit row. */
function SubTopicsPanel({ unit, canManage }) {
  const [topics, setTopics] = useState(unit.topics || []);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_TOPIC);
  const [saving, setSaving] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const reload = async () => {
    try { setTopics(await unitTopicService.getTopics(unit.id)); }
    catch (err) { notifyError(err, 'Failed to reload topics.'); }
  };

  const addTopic = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await unitTopicService.createTopic(unit.id, { title: form.title.trim(), description: form.description.trim() || null, order_index: topics.length });
      setForm(EMPTY_TOPIC);
      setAdding(false);
      await reload();
    } catch (err) { notifyError(err, 'Failed to add topic.'); }
    finally { setSaving(false); }
  };

  const updateTopic = async (e) => {
    e.preventDefault();
    if (!editingTopic) return;
    setSaving(true);
    try {
      await unitTopicService.updateTopic(editingTopic.id, { title: form.title.trim(), description: form.description.trim() || null });
      setEditingTopic(null);
      await reload();
    } catch (err) { notifyError(err, 'Failed to update topic.'); }
    finally { setSaving(false); }
  };

  const deleteTopic = async () => {
    setDeleting(true);
    try {
      await unitTopicService.deleteTopic(deleteTarget.id);
      setDeleteTarget(null);
      await reload();
    } catch (err) { notifyError(err, 'Failed to delete topic.'); }
    finally { setDeleting(false); }
  };

  const openEdit = (t) => { setEditingTopic(t); setForm({ title: t.title, description: t.description || '' }); };

  return (
    <div className="p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">Sub-Topics</span>
        {canManage && !adding && (
          <button onClick={() => { setAdding(true); setForm(EMPTY_TOPIC); }} className="text-primary text-[11px] font-semibold hover:underline flex items-center gap-0.5">
            <span className="material-symbols-outlined text-[14px]">add</span>Add
          </button>
        )}
      </div>

      {topics.length === 0 && !adding && (
        <p className="text-[11px] text-on-surface-variant">No sub-topics yet.{canManage ? ' Add one.' : ''}</p>
      )}

      <ul className="flex flex-col gap-1">
        {topics.map((t) => (
          <li key={t.id} className="group flex items-start gap-2">
            <span className="material-symbols-outlined text-[14px] text-primary mt-0.5 shrink-0">subdirectory_arrow_right</span>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-on-surface">{t.title}</p>
              {t.description && <p className="text-[11px] text-secondary">{t.description}</p>}
            </div>
            {canManage && (
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={() => openEdit(t)} className="p-0.5 text-secondary hover:text-primary rounded">
                  <span className="material-symbols-outlined text-[13px]">edit</span>
                </button>
                <button onClick={() => setDeleteTarget(t)} className="p-0.5 text-secondary hover:text-error rounded">
                  <span className="material-symbols-outlined text-[13px]">delete</span>
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* Add form */}
      {adding && (
        <form onSubmit={addTopic} className="flex flex-col gap-1.5 mt-1 bg-surface-container p-2 rounded-lg border border-outline-variant">
          <input autoFocus className="h-7 px-2 text-[12px] bg-surface border border-outline-variant rounded outline-none focus:border-primary"
            placeholder="Sub-topic title *" value={form.title} maxLength={255}
            onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="h-7 px-2 text-[12px] bg-surface border border-outline-variant rounded outline-none focus:border-primary"
            placeholder="Description (optional)" value={form.description} maxLength={500}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex gap-1 justify-end">
            <button type="button" onClick={() => setAdding(false)} className="px-2 py-0.5 text-[11px] text-secondary hover:bg-surface-container-high rounded">Cancel</button>
            <button type="submit" disabled={saving || !form.title.trim()} className="px-2 py-0.5 text-[11px] bg-primary text-on-primary rounded disabled:opacity-50">
              {saving ? '...' : 'Add'}
            </button>
          </div>
        </form>
      )}

      {/* Edit dialog */}
      {editingTopic && (
        <Dialog title="Edit Sub-Topic" onClose={() => setEditingTopic(null)}>
          <form onSubmit={updateTopic} className="p-4 flex flex-col gap-3">
            <Field label="Title *">
              <input className={inputClass} value={form.title} maxLength={255} required onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <Field label="Description">
              <textarea className={`${textareaClass} h-16`} value={form.description} maxLength={500} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditingTopic(null)} className={secondaryButton}>Cancel</button>
              <button type="submit" disabled={saving} className={primaryButton}>{saving ? 'Saving...' : 'Update'}</button>
            </div>
          </form>
        </Dialog>
      )}

      {deleteTarget && (
        <ConfirmDialog title="Delete Sub-Topic"
          message={<>Delete sub-topic <strong>{deleteTarget.title}</strong>?</>}
          confirmLabel="Delete" busy={deleting} onConfirm={deleteTopic} onClose={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}


/** Documents column inside an expanded unit row — inline upload + list. */
function DocumentsPanel({ unit, canManage, onChanged }) {
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef(null);

  const reload = useCallback(async () => {
    try { setDocs(await documentService.getDocumentsByUnit(unit.id)); }
    catch (err) { notifyError(err, 'Failed to load documents.'); }
  }, [unit.id]);

  useEffect(() => { reload(); }, [reload]);

  const upload = async (files) => {
    const list = [...files];
    const valid = list.filter((f) => {
      const ext = f.name.includes('.') ? `.${f.name.split('.').pop().toLowerCase()}` : '';
      if (!DOCUMENT_RULES.extensions.includes(ext)) { toast.error(`"${f.name}" is not supported.`); return false; }
      if (f.size > DOCUMENT_RULES.maxBytes) { toast.error(`"${f.name}" exceeds the size limit.`); return false; }
      if (f.size === 0) { toast.error(`"${f.name}" is empty.`); return false; }
      return true;
    });
    if (!valid.length) return;
    setUploading(true);
    let ok = 0;
    for (const f of valid) {
      try { await documentService.uploadDocument(unit.id, f); ok++; }
      catch (err) { notifyError(err, `Upload failed for "${f.name}".`); }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
    if (ok) { toast.success(ok === 1 ? `"${valid[0].name}" uploaded.` : `${ok} files uploaded.`); await reload(); }
  };

  const handleDownload = async (doc) => {
    setDownloadingId(doc.id);
    try { await documentService.downloadDocument(doc.id, doc.file_name); }
    catch (err) { notifyError(err, `Download failed.`); }
    finally { setDownloadingId(null); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await documentService.deleteDocument(deleteTarget.id);
      toast.success(`"${deleteTarget.file_name}" deleted.`);
      setDeleteTarget(null);
      await reload();
    } catch (err) { notifyError(err, 'Delete failed.'); }
    finally { setDeleting(false); }
  };

  return (
    <div className="p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">Documents</span>
        {canManage && (
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="text-primary text-[11px] font-semibold hover:underline flex items-center gap-0.5 disabled:opacity-50">
            <span className={`material-symbols-outlined text-[14px] ${uploading ? 'animate-spin' : ''}`}>{uploading ? 'sync' : 'upload'}</span>
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        )}
        <input ref={fileRef} type="file" className="hidden" multiple accept={DOCUMENT_RULES.accept}
          onChange={(e) => upload(e.target.files)} />
      </div>

      {docs.length === 0 ? (
        <p className="text-[11px] text-on-surface-variant">No documents yet.{canManage ? ' Upload PDFs, DOCX or TXT.' : ''}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {docs.map((doc) => (
            <li key={doc.id} className="group flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px] text-secondary shrink-0">description</span>
              <span className="flex-1 text-[12px] text-on-surface truncate" title={doc.file_name}>{doc.file_name}</span>
              <span className="text-[10px] text-outline shrink-0">{formatBytes(doc.file_size)}</span>
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={() => handleDownload(doc)} disabled={downloadingId === doc.id}
                  className="p-0.5 text-secondary hover:text-primary rounded disabled:opacity-50" title="Download">
                  <span className={`material-symbols-outlined text-[13px] ${downloadingId === doc.id ? 'animate-spin' : ''}`}>
                    {downloadingId === doc.id ? 'sync' : 'download'}
                  </span>
                </button>
                {canManage && (
                  <button onClick={() => setDeleteTarget(doc)} className="p-0.5 text-secondary hover:text-error rounded" title="Delete">
                    <span className="material-symbols-outlined text-[13px]">delete</span>
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {deleteTarget && (
        <ConfirmDialog title="Delete Document"
          message={<>Delete <strong>{deleteTarget.file_name}</strong>? This cannot be undone.</>}
          confirmLabel="Delete" busy={deleting} onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}
