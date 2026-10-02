import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { departmentsApi, permissionsApi, usersApi } from '../api/platform';
import { notifyError } from '../api/errors';
import {
  ConfirmDialog, LoadError, Dialog, Field, initials, inputClass, primaryButton, secondaryButton, textareaClass,
} from '../components/ui';
import { toast } from '../components/Toast';

const Checkbox = ({ checked, disabled, onChange, label }) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={onChange}
    title={disabled ? 'Fixed for this role' : undefined}
    className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-all ${
      checked ? 'bg-primary border-primary' : 'border-outline-variant bg-transparent'
    } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    {checked && <span className="material-symbols-outlined text-white text-[12px] font-bold">check</span>}
  </button>
);

const EMPTY_DEPT = { name: '', code: '', description: '', hod_id: '' };

export default function RoleManagement() {
  const [failed, setFailed] = useState(false);

  // ── Departments ──
  const [departments, setDepartments] = useState([]);
  const [deptLoading, setDeptLoading] = useState(true);
  const [deptSearch, setDeptSearch] = useState('');
  const [hods, setHods] = useState([]);
  const [editingDept, setEditingDept] = useState(null);
  const [deptForm, setDeptForm] = useState(EMPTY_DEPT);
  const [deptSaving, setDeptSaving] = useState(false);
  const [deleteDept, setDeleteDept] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ── Permission matrix ──
  const [matrix, setMatrix] = useState(null);
  const [draft, setDraft] = useState({}); // "key|role" -> allowed (unsaved edits)
  const [matrixSaving, setMatrixSaving] = useState(false);

  const loadDepartments = useCallback(async () => {
    setFailed(false);
    setDeptLoading(true);
    try {
      setDepartments(await departmentsApi.list());
    } catch (err) {
      setFailed(true);
      notifyError(err, 'Failed to load departments.');
    } finally {
      setDeptLoading(false);
    }
  }, []);

  const loadMatrix = useCallback(async () => {
    setFailed(false);
    try {
      setMatrix(await permissionsApi.matrix());
      setDraft({});
    } catch (err) {
      setFailed(true);
      notifyError(err, 'Failed to load the permission matrix.');
    }
  }, []);

  useEffect(() => {
    loadDepartments();
    loadMatrix();
    usersApi.list({ role: 'HOD', is_active: true, page_size: 100 }).then((r) => setHods(r.items)).catch(() => {});
  }, [loadDepartments, loadMatrix]);

  const visibleDepartments = departments.filter((d) =>
    `${d.name} ${d.code}`.toLowerCase().includes(deptSearch.trim().toLowerCase()));

  // ── Department actions ──
  const openDept = (dept) => {
    setDeptForm(dept ? { name: dept.name, code: dept.code, description: dept.description || '', hod_id: dept.hod?.id || '' } : EMPTY_DEPT);
    setEditingDept(dept || {});
  };

  const saveDept = async (e) => {
    e.preventDefault();
    setDeptSaving(true);
    const body = { name: deptForm.name.trim(), code: deptForm.code.trim(), description: deptForm.description.trim() || null,
                   hod_id: deptForm.hod_id || null };
    try {
      if (editingDept.id) await departmentsApi.update(editingDept.id, body);
      else await departmentsApi.create(body);
      toast.success(`Department ${body.name} saved.`);
      setEditingDept(null);
      await loadDepartments();
    } catch (err) {
      notifyError(err, 'Saving failed.');
    } finally {
      setDeptSaving(false);
    }
  };

  const confirmDeleteDept = async () => {
    setDeleting(true);
    try {
      await departmentsApi.remove(deleteDept.id);
      toast.success(`Department ${deleteDept.name} deleted.`);
      setDeleteDept(null);
      await loadDepartments();
    } catch (err) {
      notifyError(err, 'Delete failed.');
    } finally {
      setDeleting(false);
    }
  };

  const exportDepartments = async () => {
    try { await departmentsApi.exportCsv(); } catch (err) { notifyError(err, 'Export failed.'); }
  };

  // ── Matrix actions ──
  const groups = useMemo(() => {
    const out = [];
    for (const row of matrix?.permissions || []) {
      const group = out.find((g) => g.name === row.group);
      if (group) group.rows.push(row); else out.push({ name: row.group, rows: [row] });
    }
    return out;
  }, [matrix]);

  const cellValue = (row, cell) => draft[`${row.key}|${cell.role}`] ?? cell.allowed;
  const toggle = (row, cell) => {
    const key = `${row.key}|${cell.role}`;
    const next = !cellValue(row, cell);
    setDraft((prev) => {
      const copy = { ...prev };
      if (next === cell.allowed) delete copy[key]; else copy[key] = next;
      return copy;
    });
  };
  const pendingChanges = Object.keys(draft).length;

  const saveMatrix = async () => {
    const changes = Object.entries(draft).map(([key, allowed]) => {
      const [permission, role] = key.split('|');
      return { permission, role, allowed };
    });
    setMatrixSaving(true);
    try {
      setMatrix(await permissionsApi.save(changes));
      setDraft({});
      toast.success(`Permission matrix saved (${changes.length} change${changes.length === 1 ? '' : 's'}).`);
    } catch (err) {
      notifyError(err, 'Saving the matrix failed.');
    } finally {
      setMatrixSaving(false);
    }
  };

  const resetMatrix = async () => {
    setMatrixSaving(true);
    try {
      setMatrix(await permissionsApi.reset());
      setDraft({});
      toast.success('Permissions restored to defaults.');
    } catch (err) {
      notifyError(err);
    } finally {
      setMatrixSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-margin-mobile md:p-gutter flex flex-col h-full max-w-container-max mx-auto w-full">
      {/* Canvas Header */}
      <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-end gap-6 shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/20">
              <span className="material-symbols-outlined text-[20px]">corporate_fare</span>
            </div>
            <h2 className="text-3xl font-bold text-on-background tracking-tight">Organization Structure</h2>
          </div>
          <p className="text-base text-on-surface-variant max-w-2xl mt-3 leading-relaxed">
            Manage academic departments, assign Head of Departments, and configure role permissions across the QRepo platform.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportDepartments} className={secondaryButton}>
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export Data
          </button>
          <button onClick={() => openDept(null)} className={primaryButton}>
            <span className="material-symbols-outlined text-[18px] font-bold">add</span>
            New Department
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 mb-4">
        {failed && <LoadError what="departments and permissions" onRetry={() => { loadDepartments(); loadMatrix(); }} />}
      </div>

      <div className="flex flex-col gap-6 pb-8">
        {/* Department Management */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant flex flex-col shadow-sm overflow-hidden">
          <div className="p-4 border-b border-outline-variant bg-surface-bright flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 shrink-0">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary bg-primary-fixed-dim/30 p-1.5 rounded-lg">domain</span>
              <h3 className="text-xl font-semibold text-on-surface">Department Management</h3>
            </div>
            <div className="relative w-full sm:w-auto">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
              <input
                className="w-full sm:w-64 pl-9 pr-4 h-9 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                placeholder="Search departments..."
                value={deptSearch}
                onChange={(e) => setDeptSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap min-w-[600px]">
              <thead className="bg-surface-bright border-b border-outline-variant">
                <tr>
                  <th className="p-3 text-xs font-semibold text-secondary uppercase tracking-wider">Department</th>
                  <th className="p-3 text-xs font-semibold text-secondary uppercase tracking-wider">Head of Dept (HOD)</th>
                  <th className="p-3 text-xs font-semibold text-secondary uppercase tracking-wider text-right">Faculty</th>
                  <th className="p-3 text-xs font-semibold text-secondary uppercase tracking-wider text-right">Subjects</th>
                  <th className="p-3 w-24"></th>
                </tr>
              </thead>
              <tbody className="text-sm text-on-surface">
                {deptLoading ? (
                  <tr><td colSpan="5" className="p-6 text-center text-secondary">Loading departments...</td></tr>
                ) : visibleDepartments.length === 0 ? (
                  <tr><td colSpan="5" className="p-6 text-center text-secondary">
                    {departments.length ? 'No departments match your search.' : 'No departments yet. Create the first one.'}
                  </td></tr>
                ) : visibleDepartments.map((d) => (
                  <tr key={d.id} className="hover:bg-surface-container-low transition-colors group border-b border-outline-variant/50">
                    <td className="p-4">
                      <div className="font-medium">{d.name}</div>
                      <div className="text-xs text-secondary">{d.code}</div>
                    </td>
                    <td className="p-4">
                      {d.hod ? (
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-primary-container text-on-primary-container shrink-0 flex items-center justify-center text-xs font-bold">
                            {initials(d.hod.full_name || d.hod.email)}
                          </div>
                          <span>{d.hod.full_name || d.hod.email}</span>
                        </div>
                      ) : <span className="text-outline italic text-sm">Unassigned</span>}
                    </td>
                    <td className="p-4 text-right">{d.faculty_count}</td>
                    <td className="p-4 text-right">
                      <span className="bg-secondary-container text-on-secondary-container px-2 py-1 rounded-md text-xs font-semibold">{d.subject_count}</span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openDept(d)} className="p-1 text-secondary hover:text-primary rounded hover:bg-surface-container" title="Edit">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button onClick={() => setDeleteDept(d)} className="p-1 text-secondary hover:text-error rounded hover:bg-error-container/30" title="Delete">
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Role Matrix */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant flex flex-col shadow-sm overflow-hidden">
          <div className="p-4 border-b border-outline-variant bg-surface-bright flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary bg-primary-fixed-dim/30 p-1.5 rounded-lg">verified_user</span>
              <h3 className="text-xl font-semibold text-on-surface">Role Matrix</h3>
            </div>
            <span className="text-xs text-secondary">Admin always has every permission. Students can't be granted staff permissions.</span>
          </div>
          <div className="flex-1 overflow-auto bg-surface-container-lowest">
            {!matrix ? (
              <p className="p-6 text-center text-secondary text-sm">Loading permissions...</p>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-surface-bright border-b border-outline-variant">
                  <tr>
                    <th className="p-3 text-xs font-semibold text-secondary uppercase tracking-wider w-[40%] border-r border-outline-variant">Permission</th>
                    {matrix.roles.map((r) => (
                      <th key={r.id} className="p-3 text-xs font-semibold text-secondary uppercase tracking-wider text-center">{r.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-sm text-on-surface">
                  {groups.map((group) => (
                    <React.Fragment key={group.name}>
                      <tr className="bg-surface-container-low/50">
                        <td className="p-2 px-3 text-xs text-secondary font-bold uppercase tracking-wider" colSpan={matrix.roles.length + 1}>{group.name}</td>
                      </tr>
                      {group.rows.map((row) => (
                        <tr key={row.key} className="border-b border-outline-variant/50">
                          <td className="p-3 font-medium border-r border-outline-variant">{row.label}</td>
                          {row.cells.map((cell) => (
                            <td key={cell.role} className="p-3">
                              <div className="flex justify-center">
                                <Checkbox
                                  checked={cellValue(row, cell)}
                                  disabled={!cell.editable || matrixSaving}
                                  label={`${row.label} — ${cell.role}`}
                                  onChange={() => toggle(row, cell)}
                                />
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="p-3 bg-surface-bright border-t border-outline-variant flex flex-wrap justify-between items-center shrink-0 gap-2">
            <button onClick={resetMatrix} disabled={matrixSaving} className="text-xs text-secondary hover:text-primary hover:underline disabled:opacity-50">
              Restore defaults
            </button>
            <div className="flex items-center gap-2">
              {pendingChanges > 0 && <span className="text-xs text-secondary">{pendingChanges} unsaved change{pendingChanges === 1 ? '' : 's'}</span>}
              <button onClick={() => setDraft({})} disabled={!pendingChanges || matrixSaving} className={secondaryButton}>Discard Changes</button>
              <button onClick={saveMatrix} disabled={!pendingChanges || matrixSaving} className={primaryButton}>
                {matrixSaving ? 'Saving...' : 'Save Matrix'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {editingDept && (
        <Dialog title={editingDept.id ? `Edit ${editingDept.name}` : 'New Department'} onClose={() => setEditingDept(null)}>
          <form onSubmit={saveDept} className="p-4 flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Field label="Department name *">
                  <input className={inputClass} value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} required />
                </Field>
              </div>
              <Field label="Code *">
                <input className={inputClass} value={deptForm.code} placeholder="CSE" onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })} required />
              </Field>
            </div>
            <Field label="Head of Department" hint="Only active users with the HOD role can be assigned.">
              <select className={inputClass} value={deptForm.hod_id} onChange={(e) => setDeptForm({ ...deptForm, hod_id: e.target.value })}>
                <option value="">Unassigned</option>
                {hods.map((h) => <option key={h.id} value={h.id}>{h.full_name ? `${h.full_name} (${h.email})` : h.email}</option>)}
              </select>
            </Field>
            <Field label="Description">
              <textarea className={`${textareaClass} h-20`} value={deptForm.description} onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditingDept(null)} className={secondaryButton}>Cancel</button>
              <button type="submit" disabled={deptSaving} className={primaryButton}>{deptSaving ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </Dialog>
      )}

      {deleteDept && (
        <ConfirmDialog
          title="Delete Department"
          message={<>Delete <strong>{deleteDept.name}</strong>? Its {deleteDept.member_count} member(s) are kept but will no longer belong to a department.</>}
          confirmLabel="Delete"
          busy={deleting}
          onConfirm={confirmDeleteDept}
          onClose={() => setDeleteDept(null)}
        />
      )}
    </div>
  );
}
