import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { updateDocument } from '../../api/documents';
import { isApiError, isAuthError } from '../../api/client';
import { EmptyState } from '../ui/EmptyState';
import { Spinner } from '../ui/Spinner';
import type { Document } from '../../types/document';
import './DocumentList.css';

interface DocumentListProps {
  documents: Document[];
  canManage: boolean;
  onDelete: (doc: Document) => void;
  onUpdateSuccess: (doc: Document) => void;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const DocumentList = ({ documents, canManage, onDelete, onUpdateSuccess }: DocumentListProps) => {
  const { token, logout } = useAuth();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const startEdit = (doc: Document) => {
    setEditingId(doc.id);
    setEditName(doc.file_name);
    setUpdateError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setUpdateError(null);
  };

  const handleSave = async (doc: Document) => {
    if (!editName.trim() || editName === doc.file_name) {
      cancelEdit();
      return;
    }

    setIsUpdating(true);
    setUpdateError(null);

    try {
      const updated = await updateDocument(doc.id, { file_name: editName }, token);
      onUpdateSuccess(updated);
      setEditingId(null);
    } catch (err) {
      if (isAuthError(err)) {
        logout();
      } else if (isApiError(err)) {
        setUpdateError(err.message);
      } else {
        setUpdateError('Failed to update.');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  if (documents.length === 0) {
    return (
      <div className="doc-list-empty">
        <EmptyState
          icon="📄"
          title="No Documents"
          message="No documents have been uploaded for this unit yet."
        />
      </div>
    );
  }

  return (
    <div className="doc-list-container">
      <h3 className="doc-list-title">Uploaded Documents ({documents.length})</h3>
      
      {updateError && (
        <div className="doc-error-banner">
          {updateError}
          <button className="doc-error-close" onClick={() => setUpdateError(null)}>×</button>
        </div>
      )}

      <ul className="doc-list">
        {documents.map((doc) => (
          <li key={doc.id} className="doc-item">
            <div className="doc-icon">
              {doc.file_type.includes('pdf') ? '📕' : doc.file_type.includes('word') ? '📘' : '📄'}
            </div>
            
            <div className="doc-content">
              {editingId === doc.id ? (
                <div className="doc-edit-form">
                  <input
                    type="text"
                    className="doc-edit-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    disabled={isUpdating}
                  />
                  <div className="doc-edit-actions">
                    <button 
                      className="doc-btn-save" 
                      onClick={() => handleSave(doc)}
                      disabled={isUpdating}
                    >
                      {isUpdating ? <Spinner size="sm" /> : 'Save'}
                    </button>
                    <button 
                      className="doc-btn-cancel" 
                      onClick={cancelEdit}
                      disabled={isUpdating}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="doc-name">{doc.file_name}</p>
                  <div className="doc-meta">
                    <span className="doc-meta-item">{formatBytes(doc.file_size)}</span>
                    <span className="doc-meta-item">•</span>
                    <span className="doc-meta-item doc-status">{doc.processing_status}</span>
                  </div>
                </>
              )}
            </div>
            
            {!editingId && canManage && (
              <div className="doc-actions">
                <button 
                  className="doc-btn-edit" 
                  onClick={() => startEdit(doc)}
                  aria-label={`Edit ${doc.file_name}`}
                >
                  Rename
                </button>
                <button 
                  className="doc-btn-delete" 
                  onClick={() => onDelete(doc)}
                  aria-label={`Delete ${doc.file_name}`}
                >
                  Delete
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
