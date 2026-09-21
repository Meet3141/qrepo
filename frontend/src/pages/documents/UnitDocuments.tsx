import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Layout } from '../../components/Layout';
import { Spinner } from '../../components/ui/Spinner';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { DocumentList } from '../../components/documents/DocumentList';
import { DocumentUpload } from '../../components/documents/DocumentUpload';
import { getSubject } from '../../api/subjects';
import { getDocumentsByUnit, deleteDocument } from '../../api/documents';
import { isApiError, isAuthError } from '../../api/client';
import type { Subject, Unit } from '../../types/subject';
import type { Document } from '../../types/document';
import './UnitDocuments.css';

export const UnitDocuments = () => {
  const { subjectId, unitId } = useParams<{ subjectId: string; unitId: string }>();
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const roleName = user?.role?.name ?? '';

  const [subject, setSubject] = useState<Subject | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleAuthError = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const fetchData = useCallback(async () => {
    if (!subjectId || !unitId) return;
    setIsLoading(true);
    setFetchError(null);
    try {
      const [subjectData, docsData] = await Promise.all([
        getSubject(subjectId, token),
        getDocumentsByUnit(unitId, token)
      ]);
      setSubject(subjectData);
      
      const foundUnit = subjectData.units.find(u => u.id === unitId);
      if (!foundUnit) {
        setFetchError('Unit not found in this subject.');
      } else {
        setUnit(foundUnit);
      }
      
      setDocuments(docsData);
    } catch (err) {
      if (isAuthError(err)) {
        handleAuthError();
      } else if (isApiError(err)) {
        setFetchError(err.status === 404 ? 'Not found.' : err.message);
      } else {
        setFetchError('Failed to load data.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [subjectId, unitId, token, handleAuthError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const canManage =
    roleName === 'Admin' ||
    roleName === 'HOD' ||
    (roleName === 'Faculty' && subject?.faculty_id === user?.id);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteDocument(deleteTarget.id, token);
      setDocuments((prev) => prev.filter((d) => d.id !== deleteTarget.id));
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

  return (
    <Layout>
      <div className="ud-page">
        <button
          className="ud-back-btn"
          onClick={() => navigate(`/subjects/${subjectId}`)}
          aria-label="Back to Subject"
        >
          ← Back to Subject
        </button>

        {fetchError && (
          <ErrorMessage message={fetchError} onDismiss={() => setFetchError(null)} />
        )}

        {isLoading && (
          <div className="ud-loading">
            <Spinner size="lg" label="Loading documents…" />
          </div>
        )}

        {!isLoading && subject && unit && (
          <>
            <div className="ud-header-card">
              <h1 className="ud-title">Documents for Unit {unit.unit_number}: {unit.title}</h1>
              <p className="ud-subtitle">{subject.code} - {subject.name}</p>
            </div>

            <div className="ud-content-grid">
              {canManage && (
                <div className="ud-upload-section">
                  <DocumentUpload 
                    unitId={unit.id} 
                    onUploadSuccess={(doc) => setDocuments([...documents, doc])} 
                  />
                </div>
              )}
              
              <div className="ud-list-section">
                <DocumentList 
                  documents={documents} 
                  canManage={canManage}
                  onDelete={setDeleteTarget}
                  onUpdateSuccess={(doc) => setDocuments(docs => docs.map(d => d.id === doc.id ? doc : d))}
                />
              </div>
            </div>
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Document?"
        message={`"${deleteTarget?.file_name}" will be permanently deleted.`}
        confirmLabel="Delete Document"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isLoading={isDeleting}
      />
    </Layout>
  );
};
