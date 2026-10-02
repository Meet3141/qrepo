import React, { useState, useEffect } from 'react';
import { subjectService } from '../api/subjects';
import { unitService } from '../api/units';
import { documentService } from '../api/documents';
import { notifyError } from '../api/errors';
import { LoadError, formatBytes } from '../components/ui';

export default function StudentSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [openId, setOpenId] = useState(null);
  const [units, setUnits] = useState({});
  // { unitId: Document[] }
  const [unitDocs, setUnitDocs] = useState({});
  const [openUnitId, setOpenUnitId] = useState(null);
  const [downloadingDoc, setDownloadingDoc] = useState(null);

  const fetchSubjects = async () => {
    setLoading(true);
    setFailed(false);
    try {
      setSubjects(await subjectService.getSubjects());
    } catch (err) {
      setFailed(true);
      notifyError(err, 'Failed to load subjects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSubjects(); }, []);

  const toggleUnits = async (subjectId) => {
    if (openId === subjectId) {
      setOpenId(null);
      setOpenUnitId(null);
      return;
    }
    setOpenId(subjectId);
    setOpenUnitId(null);
    if (units[subjectId]) return;
    try {
      const list = await unitService.getUnitsBySubject(subjectId);
      setUnits((u) => ({ ...u, [subjectId]: [...list].sort((a, b) => a.unit_number - b.unit_number) }));
    } catch (err) {
      setOpenId(null);
      notifyError(err, 'Failed to load units.');
    }
  };

  const toggleUnitDocs = async (unitId) => {
    if (openUnitId === unitId) { setOpenUnitId(null); return; }
    setOpenUnitId(unitId);
    if (unitDocs[unitId]) return;
    try {
      const docs = await documentService.getDocumentsByUnit(unitId);
      setUnitDocs((d) => ({ ...d, [unitId]: docs }));
    } catch (err) {
      notifyError(err, 'Failed to load documents.');
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

  const filtered = subjects.filter(s =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-on-surface">My Subjects</h1>
          <p className="text-[13px] text-on-surface-variant mt-1">Browse and download documents for your enrolled subjects</p>
        </div>
        <div className="relative w-full sm:w-64">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
          <input
            className="bg-surface-container-low border border-outline-variant/50 focus:border-primary outline-none w-full pl-9 pr-4 h-9 rounded-lg text-[13px] text-on-surface placeholder:text-outline transition-colors"
            placeholder="Search subjects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {failed && <LoadError what="subjects" onRetry={fetchSubjects} />}

      {/* Subjects Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : failed ? null : filtered.length === 0 ? (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-12 flex flex-col items-center gap-4">
          <span className="material-symbols-outlined text-[56px] text-outline">school</span>
          <h3 className="text-[15px] font-semibold text-on-surface">No subjects found</h3>
          <p className="text-[13px] text-on-surface-variant text-center max-w-md">
            {searchTerm ? 'No subjects match your search.' : 'No subjects have been added yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((subject) => (
            <div key={subject.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 hover:shadow-sm transition-shadow flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-container/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px] text-primary">auto_stories</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[14px] font-semibold text-on-surface truncate">{subject.name}</h3>
                  <p className="text-[11px] text-on-surface-variant">{subject.code || 'No code'}</p>
                </div>
              </div>
              {subject.description && <p className="text-[12px] text-on-surface-variant line-clamp-2">{subject.description}</p>}

              {/* Units accordion */}
              {openId === subject.id && (
                <ul className="flex flex-col gap-2 text-[12px]">
                  {!units[subject.id] ? (
                    <li className="text-secondary">Loading units...</li>
                  ) : units[subject.id].length === 0 ? (
                    <li className="text-on-surface-variant">No units yet.</li>
                  ) : units[subject.id].map((u) => (
                    <li key={u.id} className="flex flex-col gap-1">
                      <button
                        onClick={() => toggleUnitDocs(u.id)}
                        className="flex items-center justify-between w-full text-left px-2 py-1 rounded-lg hover:bg-surface-container transition-colors group"
                      >
                        <span className="text-on-surface">
                          <span className="font-semibold text-primary">Unit {u.unit_number}:</span> {u.title}
                        </span>
                        <span className="material-symbols-outlined text-[14px] text-outline group-hover:text-primary transition-colors">
                          {openUnitId === u.id ? 'expand_less' : 'folder_open'}
                        </span>
                      </button>

                      {/* Documents list for unit */}
                      {openUnitId === u.id && (
                        <div className="ml-3 flex flex-col gap-1 border-l-2 border-primary-fixed-dim pl-3">
                          {!unitDocs[u.id] ? (
                            <p className="text-secondary text-[11px] py-1">Loading documents...</p>
                          ) : unitDocs[u.id].length === 0 ? (
                            <p className="text-on-surface-variant text-[11px] py-1">No documents in this unit.</p>
                          ) : unitDocs[u.id].map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between gap-2 py-1 group/doc">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="material-symbols-outlined text-[14px] text-primary shrink-0">description</span>
                                <span className="truncate text-on-surface text-[11px]" title={doc.file_name}>{doc.file_name}</span>
                                <span className="text-outline text-[10px] shrink-0">{formatBytes(doc.file_size)}</span>
                              </div>
                              <button
                                onClick={() => handleDownload(doc)}
                                disabled={downloadingDoc === doc.id}
                                title={`Download ${doc.file_name}`}
                                aria-label={`Download ${doc.file_name}`}
                                className="shrink-0 text-secondary hover:text-primary p-1 rounded hover:bg-primary-container/30 disabled:opacity-50 transition-colors"
                              >
                                <span className={`material-symbols-outlined text-[16px] ${downloadingDoc === doc.id ? 'animate-spin' : ''}`}>
                                  {downloadingDoc === doc.id ? 'sync' : 'download'}
                                </span>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-outline-variant/50 mt-auto">
                <span className="text-[11px] text-on-surface-variant">Units</span>
                <button onClick={() => toggleUnits(subject.id)} aria-expanded={openId === subject.id}
                        className="text-primary text-[12px] font-medium hover:underline flex items-center gap-1">
                  <span>{openId === subject.id ? 'Hide' : 'View'}</span>
                  <span className="material-symbols-outlined text-[14px]">{openId === subject.id ? 'expand_less' : 'arrow_forward'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
