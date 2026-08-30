import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Layout } from '../../components/Layout';
import { Spinner } from '../../components/ui/Spinner';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { UnitList } from './UnitList';
import { UnitForm } from './UnitForm';
import { getSubject } from '../../api/subjects';
import { createUnit, updateUnit, deleteUnit } from '../../api/units';
import { isApiError, isAuthError } from '../../api/client';
import type { Subject, Unit, UnitCreate, UnitUpdate } from '../../types/subject';
import './SubjectDetail.css';

/**
 * /subjects/:id — Subject detail page.
 *
 * Shows subject metadata + embedded UnitList.
 *
 * Unit management access:
 *  Admin / HOD  → always can manage units
 *  Faculty      → can manage units only if subject.faculty_id === user.id
 *  Student      → read-only
 */
export const SubjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const roleName = user?.role?.name ?? '';

  // ── Data state ────────────────────────────────────────────────
  const [subject, setSubject] = useState<Subject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ── Unit form state ───────────────────────────────────────────
  const [isUnitFormOpen, setIsUnitFormOpen] = useState(false);
  const [unitFormMode, setUnitFormMode] = useState<'create' | 'edit'>('create');
  const [editUnit, setEditUnit] = useState<Unit | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [unitSaveError, setUnitSaveError] = useState<string | null>(null);

  // ── Delete unit state ─────────────────────────────────────────
  const [deleteUnitTarget, setDeleteUnitTarget] = useState<Unit | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Auth error helper ─────────────────────────────────────────

  const handleAuthError = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  // ── Fetch subject (includes units in response) ────────────────

  const fetchSubject = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setFetchError(null);
    try {
      const data = await getSubject(id, token);
      setSubject(data);
    } catch (err) {
      if (isAuthError(err)) {
        handleAuthError();
      } else if (isApiError(err)) {
        setFetchError(
          err.status === 404 ? 'Subject not found.' : err.message,
        );
      } else {
        setFetchError('Failed to load subject.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [id, token, handleAuthError]);

  useEffect(() => {
    fetchSubject();
  }, [fetchSubject]);

  // ── Role-derived permission ───────────────────────────────────

  const canManageUnits =
    roleName === 'Admin' ||
    roleName === 'HOD' ||
    (roleName === 'Faculty' && subject?.faculty_id === user?.id);

  // ── Unit CRUD handlers ────────────────────────────────────────

  const openAddUnit = () => {
    setUnitFormMode('create');
    setEditUnit(undefined);
    setUnitSaveError(null);
    setIsUnitFormOpen(true);
  };

  const openEditUnit = (unit: Unit) => {
    setUnitFormMode('edit');
    setEditUnit(unit);
    setUnitSaveError(null);
    setIsUnitFormOpen(true);
  };

  const handleSaveUnit = async (data: UnitCreate | UnitUpdate) => {
    if (!subject) return;
    setIsSaving(true);
    setUnitSaveError(null);
    try {
      if (unitFormMode === 'create') {
        const created = await createUnit(subject.id, data as UnitCreate, token);
        // Optimistically append the new unit
        setSubject((prev) =>
          prev ? { ...prev, units: [...prev.units, created] } : prev,
        );
      } else if (editUnit) {
        const updated = await updateUnit(editUnit.id, data as UnitUpdate, token);
        setSubject((prev) =>
          prev
            ? {
                ...prev,
                units: prev.units.map((u) => (u.id === updated.id ? updated : u)),
              }
            : prev,
        );
      }
      setIsUnitFormOpen(false);
    } catch (err) {
      if (isAuthError(err)) {
        handleAuthError();
      } else if (isApiError(err)) {
        setUnitSaveError(err.message);
      } else {
        setUnitSaveError('Failed to save unit. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUnit = async () => {
    if (!deleteUnitTarget) return;
    setIsDeleting(true);
    try {
      await deleteUnit(deleteUnitTarget.id, token);
      setSubject((prev) =>
        prev
          ? { ...prev, units: prev.units.filter((u) => u.id !== deleteUnitTarget.id) }
          : prev,
      );
      setDeleteUnitTarget(null);
    } catch (err) {
      if (isAuthError(err)) {
        handleAuthError();
      } else if (isApiError(err)) {
        setFetchError(err.message);
      }
      setDeleteUnitTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────

  return (
    <Layout>
      <div className="sd-page">

        {/* Back link */}
        <button
          className="sd-back-btn"
          onClick={() => navigate('/subjects')}
          aria-label="Back to subjects"
        >
          ← Back to Subjects
        </button>

        {/* Error */}
        {fetchError && (
          <ErrorMessage message={fetchError} onDismiss={() => setFetchError(null)} />
        )}

        {/* Loading */}
        {isLoading && (
          <div className="sd-loading">
            <Spinner size="lg" label="Loading subject…" />
          </div>
        )}

        {/* Subject detail */}
        {!isLoading && subject && (
          <>
            {/* Subject header card */}
            <div className="sd-header-card">
              <div className="sd-header-top">
                <span className="sd-code-pill">{subject.code}</span>
                {subject.faculty_id && (
                  <span
                    className="sd-faculty-badge"
                    title={`Assigned faculty ID: ${subject.faculty_id}`}
                  >
                    Faculty assigned
                  </span>
                )}
              </div>

              <h1 className="sd-subject-name">{subject.name}</h1>

              {subject.description && (
                <p className="sd-subject-desc">{subject.description}</p>
              )}

              <div className="sd-meta-row">
                <div className="sd-meta-item">
                  <span className="sd-meta-label">Code</span>
                  <span className="sd-meta-value">{subject.code}</span>
                </div>
                <div className="sd-meta-item">
                  <span className="sd-meta-label">Units</span>
                  <span className="sd-meta-value">{subject.units.length}</span>
                </div>
                {subject.faculty_id && (
                  <div className="sd-meta-item">
                    <span className="sd-meta-label">Faculty ID</span>
                    <span className="sd-meta-value sd-mono">{subject.faculty_id}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Units section */}
            <UnitList
              units={subject.units}
              canManage={canManageUnits ?? false}
              onAdd={openAddUnit}
              onEdit={openEditUnit}
              onDelete={setDeleteUnitTarget}
            />
          </>
        )}
      </div>

      {/* Unit create / edit modal */}
      <UnitForm
        isOpen={isUnitFormOpen}
        mode={unitFormMode}
        unit={editUnit}
        onSave={handleSaveUnit}
        onCancel={() => setIsUnitFormOpen(false)}
        isLoading={isSaving}
        error={unitSaveError}
      />

      {/* Delete unit confirmation modal */}
      <ConfirmModal
        isOpen={!!deleteUnitTarget}
        title="Delete Unit?"
        message={`Unit ${deleteUnitTarget?.unit_number}: "${deleteUnitTarget?.title}" will be permanently deleted.`}
        confirmLabel="Delete Unit"
        onConfirm={handleDeleteUnit}
        onCancel={() => setDeleteUnitTarget(null)}
        isLoading={isDeleting}
      />
    </Layout>
  );
};
