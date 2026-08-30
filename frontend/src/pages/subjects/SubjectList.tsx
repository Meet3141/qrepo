import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Layout } from '../../components/Layout';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { SubjectForm } from './SubjectForm';
import { listSubjects, createSubject, updateSubject, deleteSubject } from '../../api/subjects';
import { isApiError, isAuthError } from '../../api/client';
import type { Subject, SubjectCreate, SubjectUpdate } from '../../types/subject';
import './SubjectList.css';

/**
 * /subjects — Subject management page.
 *
 * Role behaviour:
 *  Admin / HOD  — full CRUD (Create, Edit, Delete subject)
 *  Faculty      — read-only subject list, click to view detail
 *  Student      — read-only subject list, click to view detail
 */
export const SubjectList = () => {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const roleName = user?.role?.name ?? '';
  const canManage = roleName === 'Admin' || roleName === 'HOD';

  // ── Data state ──────────────────────────────────────────────────
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ── Create / Edit state ─────────────────────────────────────────
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editTarget, setEditTarget] = useState<Subject | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Delete state ────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Helpers ─────────────────────────────────────────────────────

  const handleAuthError = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  // ── Fetch subjects ───────────────────────────────────────────────

  const fetchSubjects = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const data = await listSubjects(token);
      setSubjects(data);
    } catch (err) {
      if (isAuthError(err)) {
        handleAuthError();
      } else if (isApiError(err)) {
        setFetchError(err.message);
      } else {
        setFetchError('Failed to load subjects.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, handleAuthError]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  // ── Create / Edit ────────────────────────────────────────────────

  const openCreate = () => {
    setFormMode('create');
    setEditTarget(undefined);
    setSaveError(null);
    setIsFormOpen(true);
  };

  const openEdit = (subject: Subject, e: React.MouseEvent) => {
    e.stopPropagation(); // don't navigate to detail
    setFormMode('edit');
    setEditTarget(subject);
    setSaveError(null);
    setIsFormOpen(true);
  };

  const handleSave = async (data: SubjectCreate | SubjectUpdate) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      if (formMode === 'create') {
        const created = await createSubject(data as SubjectCreate, token);
        setSubjects((prev) => [created, ...prev]);
      } else if (editTarget) {
        const updated = await updateSubject(editTarget.id, data as SubjectUpdate, token);
        setSubjects((prev) =>
          prev.map((s) => (s.id === updated.id ? updated : s)),
        );
      }
      setIsFormOpen(false);
    } catch (err) {
      if (isAuthError(err)) {
        handleAuthError();
      } else if (isApiError(err)) {
        setSaveError(err.message);
      } else {
        setSaveError('Failed to save subject. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────

  const openDelete = (subject: Subject, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget(subject);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteSubject(deleteTarget.id, token);
      setSubjects((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      if (isAuthError(err)) {
        handleAuthError();
      } else if (isApiError(err)) {
        setFetchError(err.message);
      }
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────

  return (
    <Layout>
      <div className="sl-page">

        {/* Page header */}
        <div className="sl-header">
          <div className="sl-header-text">
            <h1 className="sl-heading">Subjects</h1>
            <p className="sl-subheading">
              {canManage
                ? 'Create and manage academic subjects.'
                : 'Browse subjects and their units.'}
            </p>
          </div>
          {canManage && (
            <button className="sl-create-btn" onClick={openCreate} id="create-subject-btn">
              + New Subject
            </button>
          )}
        </div>

        {/* Fetch error */}
        {fetchError && (
          <ErrorMessage message={fetchError} onDismiss={() => setFetchError(null)} />
        )}

        {/* Loading */}
        {isLoading && (
          <div className="sl-loading">
            <Spinner size="lg" label="Loading subjects…" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !fetchError && subjects.length === 0 && (
          <EmptyState
            icon="📚"
            title="No subjects found"
            message={
              canManage
                ? 'Get started by creating the first subject.'
                : 'No subjects are available yet.'
            }
            action={canManage ? { label: '+ New Subject', onClick: openCreate } : undefined}
          />
        )}

        {/* Subject grid */}
        {!isLoading && subjects.length > 0 && (
          <div className="sl-grid" role="list">
            {subjects.map((subject) => (
              <article
                key={subject.id}
                className="sl-card"
                role="listitem"
                onClick={() => navigate(`/subjects/${subject.id}`)}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/subjects/${subject.id}`)}
                aria-label={`Subject: ${subject.name}`}
              >
                {/* Code pill */}
                <div className="sl-card-top">
                  <span className="sl-code-pill">{subject.code}</span>
                  {subject.faculty_id && (
                    <span className="sl-faculty-badge" title={`Faculty ID: ${subject.faculty_id}`}>
                      Faculty assigned
                    </span>
                  )}
                </div>

                {/* Name & description */}
                <h2 className="sl-card-name">{subject.name}</h2>
                {subject.description && (
                  <p className="sl-card-desc">{subject.description}</p>
                )}

                {/* Footer: unit count + actions */}
                <div className="sl-card-footer">
                  <span className="sl-unit-count">
                    {subject.units.length === 1
                      ? '1 unit'
                      : `${subject.units.length} units`}
                  </span>

                  {canManage && (
                    <div className="sl-card-actions">
                      <button
                        className="sl-btn-edit"
                        onClick={(e) => openEdit(subject, e)}
                        aria-label={`Edit ${subject.name}`}
                      >
                        Edit
                      </button>
                      <button
                        className="sl-btn-delete"
                        onClick={(e) => openDelete(subject, e)}
                        aria-label={`Delete ${subject.name}`}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit subject modal */}
      <SubjectForm
        isOpen={isFormOpen}
        mode={formMode}
        subject={editTarget}
        onSave={handleSave}
        onCancel={() => setIsFormOpen(false)}
        isLoading={isSaving}
        error={saveError}
      />

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Subject?"
        message={`"${deleteTarget?.name}" and all its units will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete Subject"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isLoading={isDeleting}
      />
    </Layout>
  );
};
