import React, { useCallback, useEffect, useRef, useState } from 'react';
import { subjectService } from '../api/subjects';
import { unitService } from '../api/units';
import { DOCUMENT_RULES, documentService } from '../api/documents';
import { notifyError } from '../api/errors';
import { PERMISSIONS } from '../api/session';
import { useSession } from '../components/Session';
import { toast } from '../components/Toast';
import { ConfirmDialog, formatBytes } from '../components/ui';

const STATUS_STYLES = {
  COMPLETED: 'bg-primary-container text-on-primary-container',
  FAILED: 'bg-error-container text-on-error-container',
  PROCESSING: 'bg-surface-variant text-on-surface-variant animate-pulse',
};

/** Client-side copy of the backend upload rules, so obviously invalid files fail fast. */
function validateFile(file) {
  const ext = file.name.includes('.') ? `.${file.name.split('.').pop().toLowerCase()}` : '';
  if (!DOCUMENT_RULES.extensions.includes(ext)) return `"${file.name}" is not supported. Upload a PDF, DOCX or TXT file.`;
  if (file.size > DOCUMENT_RULES.maxBytes) return `"${file.name}" is larger than ${formatBytes(DOCUMENT_RULES.maxBytes)}.`;
  if (file.size === 0) return `"${file.name}" is empty.`;
  return null;
}

export default function DocumentManagement() {
  const { can } = useSession();
  // Permission-matrix driven (null while loading: hide until known)
  const canUpload = can(PERMISSIONS.DOCUMENTS_UPLOAD) === true;
  const canDelete = can(PERMISSIONS.DOCUMENTS_DELETE) === true;

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');

  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [busyDoc, setBusyDoc] = useState(null);
  const [downloadingDoc, setDownloadingDoc] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    subjectService.getSubjects().then(setSubjects).catch((err) => notifyError(err, 'Failed to load subjects.'));
  }, []);

  useEffect(() => {
    setUnits([]);
    if (!selectedSubject) return;
    unitService.getUnitsBySubject(selectedSubject)
      .then((list) => setUnits([...list].sort((a, b) => a.unit_number - b.unit_number)))
      .catch((err) => notifyError(err, 'Failed to load units.'));
  }, [selectedSubject]);

  const fetchDocuments = useCallback(async () => {
    if (!selectedUnit) {
      setDocuments([]);
      return;
    }
    setLoading(true);
    try {
      setDocuments(await documentService.getDocumentsByUnit(selectedUnit));
    } catch (err) {
      setDocuments([]);
      notifyError(err, 'Failed to load documents.');
    } finally {
      setLoading(false);
    }
  }, [selectedUnit]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleSubjectChange = (e) => {
    setSelectedSubject(e.target.value);
    setSelectedUnit('');
  };

  const upload = async (files) => {
    if (!selectedUnit) return toast.error('Select a subject and unit before uploading.');
    const list = [...files];
    const valid = list.filter((file) => {
      const problem = validateFile(file);
      if (problem) toast.error(problem);
      return !problem;
    });
    if (!valid.length) return;

    setUploading(true);
    let uploaded = 0;
    for (const file of valid) {
      try {
        await documentService.uploadDocument(selectedUnit, file);
        uploaded += 1;
      } catch (err) {
        notifyError(err, `Uploading "${file.name}" failed.`);
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (uploaded) {
      toast.success(uploaded === 1 ? `"${valid[0].name}" uploaded. Extract its text to use it for AI questions.` : `${uploaded} documents uploaded.`);
      await fetchDocuments();
    }
  };

  const handleFileClick = () => {
    if (uploading) return;
    if (!selectedUnit) return toast.info('Select a subject and unit first, then choose files to upload.');
    fileInputRef.current?.click();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (!uploading && e.dataTransfer.files?.length) upload(e.dataTransfer.files);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await documentService.deleteDocument(deleteTarget.id);
      toast.success(`"${deleteTarget.file_name}" deleted.`);
      setDeleteTarget(null);
      await fetchDocuments();
    } catch (err) {
      notifyError(err, 'Delete failed.');
    } finally {
      setDeleting(false);
    }
  };

  const handleProcess = async (doc) => {
    setBusyDoc(doc.id);
    setDocuments((docs) => docs.map((d) => (d.id === doc.id ? { ...d, processing_status: 'PROCESSING' } : d)));
    try {
      const result = await documentService.processDocument(doc.id);
      toast.success(result?.processing_status === 'COMPLETED'
        ? `Text extracted from "${doc.file_name}".`
        : `Processing of "${doc.file_name}" started.`);
    } catch (err) {
      notifyError(err, `Text extraction failed for "${doc.file_name}".`);
    } finally {
      setBusyDoc(null);
      await fetchDocuments();
    }
  };

  const handleDownload = async (doc) => {
    setDownloadingDoc(doc.id);
    try {
      await documentService.downloadDocument(doc.id, doc.file_name);
    } catch (err) {
      notifyError(err, `Download failed for "${doc.file_name}".`);
    } finally {
      setDownloadingDoc(null);
    }
  };

  const unitLabel = units.find((u) => u.id === selectedUnit);

  return (
    <div className="max-w-container-max mx-auto w-full flex flex-col gap-xl">
      <div className="flex flex-col gap-sm">
        <h2 className="font-display text-3xl font-bold text-on-surface">Document Management</h2>
        <p className="text-secondary">Upload, organize, and manage source documents for assessment generation.</p>
      </div>

      {/* Filter / Selection Area */}
      <div className="flex flex-col md:flex-row gap-4 bg-surface-container-lowest p-4 rounded-xl border border-outline-variant shadow-sm">
        <label className="flex-1">
          <span className="block text-xs font-semibold text-secondary mb-1">Subject</span>
          <select
            value={selectedSubject}
            onChange={handleSubjectChange}
            className="w-full h-10 px-3 bg-surface border border-outline-variant rounded-lg text-sm text-on-surface outline-none focus:border-primary"
          >
            <option value="">Select a subject</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
          </select>
        </label>
        <label className="flex-1">
          <span className="block text-xs font-semibold text-secondary mb-1">Unit</span>
          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            disabled={!selectedSubject}
            className="w-full h-10 px-3 bg-surface border border-outline-variant rounded-lg text-sm text-on-surface outline-none focus:border-primary disabled:opacity-50"
          >
            <option value="">{selectedSubject && units.length === 0 ? 'This subject has no units yet' : 'Select a unit'}</option>
            {units.map((u) => <option key={u.id} value={u.id}>Unit {u.unit_number}: {u.title}</option>)}
          </select>
        </label>
      </div>

      {/* Drag & Drop Area */}
      {canUpload && (
        <div
          role="button"
          tabIndex={0}
          onClick={handleFileClick}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleFileClick(); } }}
          onDragOver={(e) => { e.preventDefault(); if (selectedUnit) setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          aria-disabled={!selectedUnit || uploading}
          className={`border-2 border-dashed ${dragging ? 'border-primary bg-primary-fixed/20' : 'border-primary-fixed-dim hover:border-primary bg-surface-container-low'} rounded-xl p-xl flex flex-col items-center justify-center text-center relative overflow-hidden group transition-colors ${!selectedUnit ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => upload(e.target.files)}
            className="hidden"
            accept={DOCUMENT_RULES.accept}
            multiple
          />
          <div className="absolute inset-0 bg-primary-fixed opacity-0 group-hover:opacity-10 transition-opacity"></div>
          <div className="w-16 h-16 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center mb-md shadow-sm">
            <span className={`material-symbols-outlined text-[36px] ${uploading ? 'animate-spin' : ''}`} style={{ fontVariationSettings: "'FILL' 0" }}>
              {uploading ? 'sync' : 'cloud_upload'}
            </span>
          </div>
          <h3 className="font-bold text-xl text-on-surface mb-xs">
            {uploading ? 'Uploading...' : 'Drag & Drop files here'}
          </h3>
          <p className="text-secondary mb-md">
            {uploading ? 'Please wait...' : selectedUnit ? 'or click to browse from your computer' : 'Select a subject and unit to enable uploads'}
          </p>
          <p className="text-xs font-semibold text-outline">Supported files: PDF, DOCX, TXT. Max size: {formatBytes(DOCUMENT_RULES.maxBytes)}.</p>

          <span className="mt-md bg-surface-container-lowest border border-outline-variant text-secondary py-2 px-4 rounded-lg text-sm font-medium shadow-sm">
            {selectedUnit ? 'Select Files' : 'Select a Unit First'}
          </span>
        </div>
      )}

      {/* Uploaded Files List */}
      <div className="flex flex-col gap-md">
        <h3 className="font-bold text-xl text-on-surface">
          Documents{unitLabel ? ` — Unit ${unitLabel.unit_number}: ${unitLabel.title}` : ''}
        </h3>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-surface-container-low border-b border-outline-variant text-xs text-secondary font-semibold">
              <tr>
                <th className="p-md">Document Name</th>
                <th className="p-md">Type</th>
                <th className="p-md">Size</th>
                <th className="p-md">Status</th>
                <th className="p-md hidden lg:table-cell">Date Uploaded</th>
                <th className="p-md text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm text-on-surface divide-y divide-outline-variant">
              {loading ? (
                <tr><td colSpan={6} className="p-4 text-center text-secondary">Loading documents...</td></tr>
              ) : documents.length > 0 ? (
                documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-surface-container-low transition-colors group">
                    <td className="p-md">
                      <div className="flex items-center gap-sm">
                        <div className="w-8 h-8 rounded bg-primary-fixed-dim text-on-primary-fixed flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-sm">description</span>
                        </div>
                        <span className="font-medium truncate max-w-[200px] md:max-w-xs" title={doc.file_name}>{doc.file_name}</span>
                      </div>
                    </td>
                    <td className="p-md"><span className="bg-surface-variant text-on-surface-variant px-2 py-1 rounded-full text-[11px] font-medium uppercase">{doc.file_name.split('.').pop()}</span></td>
                    <td className="p-md text-secondary">{formatBytes(doc.file_size)}</td>
                    <td className="p-md">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[doc.processing_status] || 'bg-surface-variant text-on-surface-variant'}`}>
                        {doc.processing_status}
                      </span>
                    </td>
                    <td className="p-md hidden lg:table-cell text-secondary">{new Date(doc.created_at).toLocaleDateString()}</td>
                    <td className="p-md text-right">
                        <div className="flex justify-end gap-sm md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <button onClick={() => handleDownload(doc)} disabled={downloadingDoc === doc.id}
                                  className="text-secondary hover:text-primary p-1 rounded hover:bg-primary-container/30 disabled:opacity-50"
                                  title="Download" aria-label={`Download ${doc.file_name}`}>
                            <span className={`material-symbols-outlined text-[20px] ${downloadingDoc === doc.id ? 'animate-spin' : ''}`}>
                              {downloadingDoc === doc.id ? 'sync' : 'download'}
                            </span>
                          </button>
                          {(doc.processing_status === 'PENDING' || doc.processing_status === 'FAILED') && (
                            <button onClick={() => handleProcess(doc)} disabled={busyDoc === doc.id}
                                    className="text-secondary hover:text-primary p-1 rounded hover:bg-primary-container/30 disabled:opacity-50"
                                    title="Extract text" aria-label={`Extract text from ${doc.file_name}`}>
                              <span className={`material-symbols-outlined text-[20px] ${busyDoc === doc.id ? 'animate-spin' : ''}`}>
                                {busyDoc === doc.id ? 'sync' : 'transform'}
                              </span>
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => setDeleteTarget(doc)} className="text-secondary hover:text-error p-1 rounded hover:bg-error-container/30"
                                    title="Delete" aria-label={`Delete ${doc.file_name}`}>
                              <span className="material-symbols-outlined text-[20px]">delete</span>
                            </button>
                          )}
                        </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-secondary">
                    {selectedUnit ? 'No documents in this unit yet.' : 'Select a subject and unit to see its documents.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Document"
          message={<>Delete <strong>{deleteTarget.file_name}</strong>? Its extracted text will no longer be used for AI questions. This cannot be undone.</>}
          confirmLabel="Delete"
          busy={deleting}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
