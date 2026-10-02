import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '../api/client';

export default function DocumentManagement() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  const role = localStorage.getItem('user_role') || 'Student';
  const canManage = ['Admin', 'HOD', 'Faculty'].includes(role);

  const fetchSubjects = async () => {
    try {
      const response = await apiClient.get('/subjects');
      setSubjects(response.data.data || []);
    } catch (err) {
      console.error("Failed to fetch subjects", err);
    }
  };

  const fetchUnits = async (subjectId) => {
    try {
      const response = await apiClient.get(`/subjects/${subjectId}/units`);
      setUnits(response.data.data || []);
    } catch (err) {
      console.error("Failed to fetch units", err);
    }
  };

  const fetchDocuments = async () => {
    if (!selectedUnit) {
      setDocuments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await apiClient.get(`/units/${selectedUnit}/documents`);
      setDocuments(response.data.data || []);
    } catch (err) {
      console.error("Failed to fetch documents", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [selectedUnit]);

  const handleSubjectChange = (e) => {
    const subjectId = e.target.value;
    setSelectedSubject(subjectId);
    setSelectedUnit('');
    setUnits([]);
    if (subjectId) {
      fetchUnits(subjectId);
    } else {
      fetchDocuments(); // Refetch global
    }
  };

  const handleUnitChange = (e) => {
    setSelectedUnit(e.target.value);
  };

  const handleFileClick = () => {
    if (!selectedUnit) {
      alert('Please select a Subject and Unit first before uploading.');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!selectedUnit) {
      setUploadError('Unit must be selected');
      return;
    }

    setUploading(true);
    setUploadError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      await apiClient.post(`/units/${selectedUnit}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // Refresh documents
      await fetchDocuments();
    } catch (err) {
      setUploadError(err.response?.data?.message || err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
      // reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    try {
      await apiClient.delete(`/documents/${docId}`);
      await fetchDocuments();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleProcess = async (docId) => {
    try {
      await apiClient.post(`/documents/${docId}/process`);
      await fetchDocuments();
    } catch (err) {
      alert(err.response?.data?.message || 'Process failed');
    }
  };

  return (
    <div className="max-w-container-max mx-auto py-lg md:py-xl w-full flex flex-col gap-xl">
      <div className="flex flex-col gap-sm">
        <h2 className="font-display text-3xl font-bold text-on-surface">Document Management</h2>
        <p className="text-secondary">Upload, organize, and manage source documents for assessment generation.</p>
      </div>

      {/* Filter / Selection Area */}
      <div className="flex flex-col md:flex-row gap-4 bg-surface-container-lowest p-4 rounded-xl border border-outline-variant shadow-sm">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-secondary mb-1">Select Subject</label>
          <select 
            value={selectedSubject} 
            onChange={handleSubjectChange}
            className="w-full h-10 px-3 bg-surface border border-outline-variant rounded-lg text-sm text-on-surface outline-none focus:border-primary"
          >
            <option value="">All Subjects</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-semibold text-secondary mb-1">Select Unit</label>
          <select 
            value={selectedUnit} 
            onChange={handleUnitChange}
            disabled={!selectedSubject}
            className="w-full h-10 px-3 bg-surface border border-outline-variant rounded-lg text-sm text-on-surface outline-none focus:border-primary disabled:opacity-50"
          >
            <option value="">All Units</option>
            {units.map(u => <option key={u.id} value={u.id}>Unit {u.unit_number}: {u.title}</option>)}
          </select>
        </div>
      </div>
      
      {/* Drag & Drop Area */}
      {canManage && (
        <div 
          onClick={handleFileClick}
          className={`border-2 border-dashed ${uploadError ? 'border-error text-error' : 'border-primary-fixed-dim hover:border-primary'} bg-surface-container-low rounded-xl p-xl flex flex-col items-center justify-center text-center relative overflow-hidden group transition-colors ${!selectedUnit ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept=".pdf,.doc,.docx,.txt"
          />
          <div className="absolute inset-0 bg-primary-fixed opacity-0 group-hover:opacity-10 transition-opacity"></div>
          <div className={`w-16 h-16 rounded-full ${uploadError ? 'bg-error-container text-on-error-container' : 'bg-primary-container text-on-primary-container'} flex items-center justify-center mb-md shadow-sm`}>
            {uploading ? (
              <span className="material-symbols-outlined text-[36px] animate-spin">sync</span>
            ) : (
              <span className="material-symbols-outlined text-[36px]" style={{ fontVariationSettings: "'FILL' 0" }}>
                {uploadError ? 'error' : 'cloud_upload'}
              </span>
            )}
          </div>
          <h3 className="font-bold text-xl text-on-surface mb-xs">
            {uploading ? 'Uploading...' : 'Drag & Drop files here'}
          </h3>
          <p className="text-secondary mb-md">
            {uploadError || (uploading ? 'Please wait...' : 'or click to browse from your computer')}
          </p>
          <p className="text-xs font-semibold text-outline">Supported files: PDF, DOC, DOCX, TXT. Max size: 10MB.</p>
          
          <button 
            type="button" 
            disabled={!selectedUnit || uploading}
            className="mt-md bg-surface-container-lowest border border-outline-variant text-secondary py-2 px-4 rounded-lg text-sm font-medium hover:bg-surface-container-low transition-colors shadow-sm disabled:opacity-50"
          >
            {selectedUnit ? 'Select Files' : 'Select a Unit First'}
          </button>
        </div>
      )}
      
      {/* Uploaded Files List */}
      <div className="flex flex-col gap-md">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-xl text-on-surface">Documents {selectedUnit && '- Selected Unit'}</h3>
          <div className="flex gap-sm">
            <button className="text-secondary hover:text-primary transition-colors p-1"><span className="material-symbols-outlined">filter_list</span></button>
            <button className="text-secondary hover:text-primary transition-colors p-1"><span className="material-symbols-outlined">sort</span></button>
          </div>
        </div>
        
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-surface-container-low border-b border-outline-variant text-xs text-secondary font-semibold">
              <tr>
                <th className="p-md">Document Name</th>
                <th className="p-md">Type</th>
                <th className="p-md">Status</th>
                <th className="p-md hidden lg:table-cell">Date Uploaded</th>
                {canManage && <th className="p-md text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="text-sm text-on-surface divide-y divide-outline-variant">
              {loading ? (
                <tr>
                  <td colSpan={canManage ? "5" : "4"} className="p-4 text-center text-secondary">Loading documents...</td>
                </tr>
              ) : documents.length > 0 ? (
                documents.map(doc => (
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
                    <td className="p-md">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        doc.processing_status === 'COMPLETED' ? 'bg-primary-container text-on-primary-container' : 
                        doc.processing_status === 'FAILED' ? 'bg-error-container text-on-error-container' : 
                        doc.processing_status === 'PROCESSING' ? 'bg-surface-variant text-on-surface-variant animate-pulse' :
                        'bg-surface-variant text-on-surface-variant'
                      }`}>
                        {doc.processing_status}
                      </span>
                    </td>
                    <td className="p-md hidden lg:table-cell text-secondary">{new Date(doc.created_at).toLocaleDateString()}</td>
                    {canManage && (
                      <td className="p-md text-right">
                        <div className="flex justify-end gap-sm opacity-0 group-hover:opacity-100 transition-opacity">
                          {doc.processing_status === 'PENDING' || doc.processing_status === 'FAILED' ? (
                            <button onClick={() => handleProcess(doc.id)} className="text-secondary hover:text-primary p-1 rounded hover:bg-primary-container/30" title="Extract Text">
                              <span className="material-symbols-outlined text-[20px]">transform</span>
                            </button>
                          ) : null}
                          <button onClick={() => handleDelete(doc.id)} className="text-secondary hover:text-error p-1 rounded hover:bg-error-container/30" title="Delete">
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={canManage ? "5" : "4"} className="p-4 text-center text-secondary">
                    {selectedUnit ? 'No documents found for this unit.' : 'No documents found. Select a unit to upload.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
