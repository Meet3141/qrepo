import React, { useCallback, useEffect, useState } from 'react';
import { facultyApi } from '../api/platform';
import { notifyError } from '../api/errors';
import { Banner, LoadError, Dialog, Field, initials, inputClass, primaryButton, secondaryButton } from '../components/ui';
import { toast } from '../components/Toast';

const EMPTY_FORM = { full_name: '', email: '', password: '', department_id: '' };

export default function HodFacultyManagement() {
  const [faculty, setFaculty] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [menuFor, setMenuFor] = useState(null);
  const [moving, setMoving] = useState(null);
  const [moveTo, setMoveTo] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const load = useCallback(async () => {
    setFailed(false);
    setLoading(true);
    try {
      const params = {};
      if (departmentId) params.department_id = departmentId;
      if (search) params.search = search;
      const result = await facultyApi.list(params);
      setFaculty(result.items);
      setDepartments(result.departments);
    } catch (err) {
      setFailed(true);
      notifyError(err, 'Failed to load faculty.');
    } finally {
      setLoading(false);
    }
  }, [departmentId, search]);

  useEffect(() => { load(); }, [load]);

  const exportReport = async () => {
    try { await facultyApi.exportCsv(departmentId ? { department_id: departmentId } : {}); }
    catch (err) { notifyError(err, 'Export failed.'); }
  };

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, department_id: departmentId || departments[0]?.id || '' });
    setAdding(true);
  };

  const addFaculty = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await facultyApi.create({
        full_name: form.full_name.trim(), email: form.email.trim(), password: form.password,
        department_id: form.department_id || null,
      });
      toast.success(`${created.full_name || created.email} added to ${created.department_name}.`);
      setAdding(false);
      await load();
    } catch (err) {
      notifyError(err, 'Could not add the faculty member.');
    } finally {
      setSaving(false);
    }
  };

  const [updating, setUpdating] = useState(false);
  const update = async (member, body, message) => {
    setMenuFor(null);
    if (updating) return;
    setUpdating(true);
    try {
      await facultyApi.update(member.id, body);
      toast.success(message);
      await load();
    } catch (err) {
      notifyError(err);
    } finally {
      setUpdating(false);
    }
  };

  const noDepartment = !loading && departments.length === 0;

  return (
    <div className="flex-1 p-margin-mobile md:p-gutter max-w-container-max mx-auto w-full flex flex-col gap-6 h-full overflow-y-auto"
         onClick={() => setMenuFor(null)}>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-on-surface">Faculty Management</h2>
          <p className="text-sm text-on-surface-variant mt-1">Faculty in the departments you head, with their subjects, AI question and paper activity.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportReport} className={secondaryButton}>Export Report</button>
          <button onClick={openAdd} disabled={noDepartment} className={primaryButton}>
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Add Faculty
          </button>
        </div>
      </div>
      {failed && <LoadError what="faculty" onRetry={load} />}
      {noDepartment && (
        <Banner kind="info">You are not assigned as Head of any department yet. Ask an administrator to assign you under Dept &amp; Roles.</Banner>
      )}

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm flex flex-col overflow-hidden min-h-[400px]">
        <div className="p-4 border-b border-outline-variant bg-surface-bright flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="relative w-full sm:w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
            <input className="w-full pl-9 pr-4 h-9 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface focus:border-primary outline-none"
                   placeholder="Search faculty..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          {departments.length > 1 && (
            <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}
                    className="h-9 px-3 rounded-lg border border-outline-variant text-sm bg-surface-container-lowest outline-none focus:border-primary">
              <option value="">All my departments</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
            </select>
          )}
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-surface-bright border-b border-outline-variant">
              <tr>
                <th className="p-4 text-xs font-semibold text-secondary uppercase tracking-wider">Faculty Name</th>
                <th className="p-4 text-xs font-semibold text-secondary uppercase tracking-wider">Department</th>
                <th className="p-4 text-xs font-semibold text-secondary uppercase tracking-wider text-center">Subjects</th>
                <th className="p-4 text-xs font-semibold text-secondary uppercase tracking-wider text-center">AI Questions</th>
                <th className="p-4 text-xs font-semibold text-secondary uppercase tracking-wider text-center">Papers</th>
                <th className="p-4 text-xs font-semibold text-secondary uppercase tracking-wider">Status</th>
                <th className="p-4 w-12 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm text-on-surface">
              {loading ? (
                <tr><td colSpan="7" className="p-6 text-center text-secondary">Loading faculty...</td></tr>
              ) : faculty.length === 0 ? (
                <tr><td colSpan="7" className="p-6 text-center text-secondary">No faculty found.</td></tr>
              ) : faculty.map((f) => (
                <tr key={f.id} className="hover:bg-surface-container-low transition-colors group border-b border-outline-variant/50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-fixed-dim flex items-center justify-center text-xs font-bold text-primary">
                        {initials(f.full_name || f.email)}
                      </div>
                      <div>
                        <div className="font-semibold">{f.full_name || '—'}</div>
                        <div className="text-xs text-secondary">{f.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-secondary">{f.department_name || '—'}</td>
                  <td className="p-4 text-center">
                    <span className="bg-secondary-container text-on-secondary-container px-2 py-1 rounded-md text-xs font-semibold">{f.subjects_assigned}</span>
                  </td>
                  <td className="p-4 text-center text-secondary" title="Accepted / generated (acceptance rate of reviewed drafts)">
                    {f.questions_accepted} / {f.questions_generated}
                    {f.acceptance_rate != null && <span className="text-xs"> · {Math.round(f.acceptance_rate * 100)}%</span>}
                  </td>
                  <td className="p-4 text-center text-secondary" title="Approved / created">{f.papers_approved} / {f.papers_created}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${f.is_active ? 'bg-green-100 text-green-700' : 'bg-surface-variant text-on-surface-variant'}`}>
                      {f.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4 text-center relative">
                    <button onClick={(e) => { e.stopPropagation(); setMenuFor(menuFor === f.id ? null : f.id); }}
                            className="text-outline hover:text-primary transition-colors p-1" aria-label={`Actions for ${f.email}`}>
                      <span className="material-symbols-outlined text-[20px]">more_vert</span>
                    </button>
                    {menuFor === f.id && (
                      <div className="absolute right-4 top-12 z-20 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg py-1 min-w-[180px] text-left"
                           onClick={(e) => e.stopPropagation()}>
                        <button className="w-full text-left px-4 py-2 text-sm hover:bg-surface-container"
                                onClick={() => update(f, { is_active: !f.is_active }, `${f.email} ${f.is_active ? 'deactivated' : 'reactivated'}.`)}>
                          {f.is_active ? 'Deactivate' : 'Reactivate'}
                        </button>
                        {departments.length > 1 && (
                          <button className="w-full text-left px-4 py-2 text-sm hover:bg-surface-container"
                                  onClick={() => { setMenuFor(null); setMoveTo(f.department_id || ''); setMoving(f); }}>
                            Move to department…
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-outline-variant bg-surface-bright">
          <span className="text-xs text-secondary font-medium">{faculty.length} faculty member{faculty.length === 1 ? '' : 's'}</span>
        </div>
      </div>

      {adding && (
        <Dialog title="Add Faculty" onClose={() => setAdding(false)}>
          <form onSubmit={addFaculty} className="p-4 flex flex-col gap-4">
            <Field label="Full name *">
              <input className={inputClass} value={form.full_name} required minLength={2} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </Field>
            <Field label="Email *">
              <input type="email" className={inputClass} value={form.email} required onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Temporary password *" hint="At least 8 characters with a letter, a number and a symbol (@$!%*#?&).">
              <input type="password" className={inputClass} value={form.password} required autoComplete="new-password"
                     onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
            {departments.length > 1 && (
              <Field label="Department *">
                <select className={inputClass} value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
                </select>
              </Field>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAdding(false)} className={secondaryButton}>Cancel</button>
              <button type="submit" disabled={saving} className={primaryButton}>{saving ? 'Adding...' : 'Add faculty'}</button>
            </div>
          </form>
        </Dialog>
      )}

      {moving && (
        <Dialog title={`Move ${moving.full_name || moving.email}`} onClose={() => setMoving(null)} width="max-w-sm">
          <div className="p-4 flex flex-col gap-4">
            <Field label="Department">
              <select className={inputClass} value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
              </select>
            </Field>
            <div className="flex justify-end gap-2">
              <button onClick={() => setMoving(null)} className={secondaryButton}>Cancel</button>
              <button onClick={() => { update(moving, { department_id: moveTo }, `${moving.email} moved.`); setMoving(null); }}
                      disabled={!moveTo || moveTo === moving.department_id} className={primaryButton}>Move</button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
