import { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { uploadDocument } from '../../api/documents';
import { isApiError, isAuthError } from '../../api/client';
import { Spinner } from '../ui/Spinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import type { Document } from '../../types/document';
import './DocumentUpload.css';

interface DocumentUploadProps {
  unitId: string;
  onUploadSuccess: (doc: Document) => void;
}

const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt'];
const ALLOWED_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

export const DocumentUpload = ({ unitId, onUploadSuccess }: DocumentUploadProps) => {
  const { token, logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    // UX validation
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext) || !ALLOWED_MIME.includes(file.type)) {
      setUploadError(`Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setUploadError(`File is too large (max ${MAX_SIZE_MB}MB).`);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const doc = await uploadDocument(unitId, selectedFile, token);
      onUploadSuccess(doc);
      
      // Reset after success
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      if (isAuthError(err)) {
        logout();
      } else if (isApiError(err)) {
        setUploadError(err.message);
      } else {
        setUploadError('Failed to upload document.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="doc-upload">
      <h3 className="doc-upload-title">Upload Document</h3>
      
      {uploadError && (
        <ErrorMessage message={uploadError} onDismiss={() => setUploadError(null)} />
      )}

      <div className="doc-upload-field">
        <label htmlFor="file-upload" className="sr-only">Choose file</label>
        <input
          id="file-upload"
          type="file"
          accept={ALLOWED_EXTENSIONS.join(',')}
          onChange={handleFileChange}
          disabled={isUploading}
          ref={fileInputRef}
          className="doc-upload-input"
        />
        <p className="doc-upload-hint">Max size: {MAX_SIZE_MB}MB. Types: PDF, DOCX, TXT</p>
      </div>

      <button
        className="doc-upload-btn"
        onClick={handleUpload}
        disabled={!selectedFile || isUploading}
      >
        {isUploading ? (
          <>
            <Spinner size="sm" label="Uploading..." />
            <span style={{ marginLeft: '8px' }}>Uploading...</span>
          </>
        ) : (
          'Upload File'
        )}
      </button>
    </div>
  );
};
