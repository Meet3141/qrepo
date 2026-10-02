import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import { papersApi } from '../api/platform';
import { notifyError } from '../api/errors';
import { PaperDistribution, PaperForm, PaperQuestions } from '../components/papers';
import {
  Banner, ConfirmDialog, LoadError, Dialog, primaryButton, secondaryButton, StatusPill, textareaClass, timeAgo,
} from '../components/ui';
import { toast } from '../components/Toast';

const PAGE_SIZE = 15;
const TABS = [
  ['', 'All'], ['DRAFT', 'Drafts'], ['PENDING_REVIEW', 'Pending Review'], ['CHANGES_REQUESTED', 'Changes Requested'],
  ['APPROVED', 'Approved'], ['REJECTED', 'Rejected'],
];

export default function GeneratedPapers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [papers, setPapers] = useState([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({});
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const [subjects, setSubjects] = useState([]);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formBusy, setFormBusy] = useState(false);
  const [detail, setDetail] = useState(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchTerm.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const load = useCallback(async () => {
    setFailed(false);
    setLoading(true);
    try {
      const params = { page, page_size: PAGE_SIZE };
      if (status) params.status = status;
      if (search) params.search = search;
      const result = await papersApi.list(params);
      setPapers(result.items);
      setTotal(result.total);
      setCounts(result.status_counts);
    } catch (err) {
      setFailed(true);
      notifyError(err, 'Failed to load papers.');
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);

  useEffect(() => { load(); }, [load]);

  // Subjects the user may build papers for (Faculty: only their assigned subjects)
  useEffect(() => {
    (async () => {
      try {
        const [subjectsRes, meRes] = await Promise.all([apiClient.get('/subjects'), apiClient.get('/auth/me')]);
        const me = meRes.data.data;
        const all = subjectsRes.data.data || [];
        setSubjects(me.role?.name === 'Faculty' ? all.filter((s) => s.faculty_id === me.id) : all);
      } catch { /* subjects only needed for "New Paper" */ }
    })();
  }, []);

  const openDetail = useCallback(async (id) => {
    setShowAnswers(false);
    setNote('');
    try {
      setDetail(await papersApi.get(id));
    } catch (err) {
      notifyError(err, 'Failed to open paper.');
    }
  }, []);

  // Deep link: /dashboard/papers?paper=<id> (e.g. after "Generate Balanced Draft")
  useEffect(() => {
    const id = searchParams.get('paper');
    if (id) {
      openDetail(id);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, openDetail]);

  const create = async (body) => {
    setFormBusy(true);
    try {
      const paper = await papersApi.create(body);
      setCreating(false);
      toast.success(`Paper "${paper.title}" built with ${paper.question_count} questions.`);
      await load();
      setDetail(paper);
    } catch (err) {
      notifyError(err, 'Could not build the paper.');
    } finally {
      setFormBusy(false);
    }
  };

  const update = async (body) => {
    setFormBusy(true);
    try {
      const paper = await papersApi.update(editing.id, body);
      setEditing(null);
      toast.success(`Paper "${paper.title}" updated.`);
      await load();
      setDetail(paper);
    } catch (err) {
      notifyError(err, 'Saving failed.');
    } finally {
      setFormBusy(false);
    }
  };

  const openEdit = async (paperOrSummary) => {
    try {
      const paper = paperOrSummary.blueprint ? paperOrSummary : await papersApi.get(paperOrSummary.id);
      if (!paper.can_edit) {
        toast.error('Only draft papers (or papers returned for changes) can be edited.');
        return;
      }
      setDetail(null);
      setEditing(paper);
    } catch (err) {
      notifyError(err);
    }
  };

  const act = async (fn, message) => {
    setBusy(true);
    try {
      const paper = await fn();
      setDetail(paper);
      setNote('');
      toast.success(message);
      await load();
    } catch (err) {
      notifyError(err);
    } finally {
      setBusy(false);
    }
  };

  const download = async (id, withAnswers) => {
    try { await papersApi.downloadPdf(id, withAnswers); } catch (err) { notifyError(err, 'Download failed.'); }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await papersApi.remove(deleteTarget.id);
      toast.success(`Paper "${deleteTarget.title}" deleted.`);
      setDeleteTarget(null);
      setDetail(null);
      await load();
    } catch (err) {
      notifyError(err, 'Delete failed.');
    } finally {
      setBusy(false);
    }
  };

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const allCount = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex-1 p-md md:p-lg lg:p-xl max-w-container-max mx-auto w-full flex flex-col gap-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md">
        <div>
          <h2 className="font-display text-4xl font-bold text-on-surface">Generated Papers</h2>
          <p className="text-sm text-secondary mt-1">Build papers from accepted questions, send them for HOD review, and export finalized PDFs.</p>
        </div>
        <button onClick={() => setCreating(true)} disabled={!subjects.length} className={primaryButton}
                title={subjects.length ? undefined : 'No subjects available to you'}>
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Paper
        </button>
      </div>
      {failed && <LoadError what="papers" onRetry={load} />}

      {/* Status tabs + search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {TABS.map(([key, label]) => (
            <button key={key || 'all'} onClick={() => { setStatus(key); setPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${status === key ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant text-secondary hover:bg-surface-container'}`}>
              {label} <span className="opacity-70">({key ? counts[key] ?? 0 : allCount})</span>
            </button>
          ))}
        </div>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
          <input className="w-full md:w-64 h-9 pl-9 pr-4 bg-surface border border-outline-variant rounded-lg text-[13px] outline-none focus:border-primary"
                 placeholder="Search titles..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* Data Table Card */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="p-3 text-xs text-secondary uppercase tracking-wider font-semibold">Paper Title</th>
                <th className="p-3 text-xs text-secondary uppercase tracking-wider font-semibold">Subject</th>
                <th className="p-3 text-xs text-secondary uppercase tracking-wider font-semibold">Questions</th>
                <th className="p-3 text-xs text-secondary uppercase tracking-wider font-semibold">Updated</th>
                <th className="p-3 text-xs text-secondary uppercase tracking-wider font-semibold">Status</th>
                <th className="p-3 text-xs text-secondary uppercase tracking-wider font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm text-on-surface divide-y divide-outline-variant">
              {loading ? (
                <tr><td colSpan="6" className="p-4 text-center text-secondary">Loading papers...</td></tr>
              ) : papers.length === 0 ? (
                <tr><td colSpan="6" className="p-6 text-center text-secondary">No papers found. Use "New Paper" to build one from accepted questions.</td></tr>
              ) : papers.map((paper) => (
                <tr key={paper.id} className="hover:bg-surface-container-low transition-colors group">
                  <td className="p-3 align-middle">
                    <button onClick={() => openDetail(paper.id)} className="flex items-center gap-3 text-left">
                      <div className="w-8 h-8 rounded bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-sm">description</span>
                      </div>
                      <div>
                        <p className="font-medium text-on-surface group-hover:text-primary transition-colors">{paper.title}</p>
                        <p className="text-xs text-secondary mt-0.5">{paper.exam_type} · v{paper.version} · {paper.created_by?.full_name || paper.created_by?.email}</p>
                      </div>
                    </button>
                  </td>
                  <td className="p-3 align-middle text-secondary">{paper.subject_code} — {paper.subject_name}</td>
                  <td className="p-3 align-middle text-secondary">{paper.question_count} · {paper.total_marks} marks</td>
                  <td className="p-3 align-middle text-secondary">{timeAgo(paper.updated_at)}</td>
                  <td className="p-3 align-middle"><StatusPill status={paper.status} /></td>
                  <td className="p-3 align-middle text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => download(paper.id, false)} className="p-1 text-secondary hover:text-primary hover:bg-surface-container rounded" title="Download PDF">
                        <span className="material-symbols-outlined text-[18px]">download</span>
                      </button>
                      <button onClick={() => openEdit(paper)} className="p-1 text-secondary hover:text-on-surface hover:bg-surface-container rounded" title="Edit Blueprint">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button onClick={() => setDeleteTarget(paper)} className="p-1 text-secondary hover:text-error hover:bg-error-container/30 rounded" title="Delete">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-surface-container-lowest border-t border-outline-variant p-3 flex items-center justify-between">
          <p className="text-xs text-secondary">
            {total ? `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total} papers` : 'No papers'}
          </p>
          <div className="flex gap-1">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 rounded border border-outline-variant text-secondary text-xs disabled:opacity-50">Previous</button>
            <span className="px-3 py-1 text-xs text-secondary">Page {page} of {pages}</span>
            <button disabled={page >= pages} onClick={() => setPage(page + 1)} className="px-3 py-1 rounded border border-outline-variant text-secondary text-xs disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      {creating && (
        <Dialog title="New Paper" onClose={() => setCreating(false)} width="max-w-2xl">
          <PaperForm subjects={subjects} onSubmit={create} onCancel={() => setCreating(false)} busy={formBusy} />
        </Dialog>
      )}

      {editing && (
        <Dialog title={`Edit ${editing.title}`} onClose={() => setEditing(null)} width="max-w-2xl">
          <PaperForm paper={editing} onSubmit={update} onCancel={() => setEditing(null)} busy={formBusy} />
        </Dialog>
      )}

      {detail && (
        <Dialog title={detail.title} onClose={() => setDetail(null)} width="max-w-4xl">
          <div className="p-5 flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2 text-sm text-secondary">
              <StatusPill status={detail.status} />
              <span>{detail.subject_code} — {detail.subject_name}</span>
              <span>· {detail.exam_type} · version {detail.version}</span>
            </div>
            {detail.warnings?.map((w) => <Banner key={w} kind="warning">{w}</Banner>)}
            <PaperDistribution paper={detail} />

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs text-secondary uppercase tracking-wider font-semibold">Questions ({detail.question_count})</h4>
                <label className="text-xs flex items-center gap-1 text-secondary">
                  <input type="checkbox" checked={showAnswers} onChange={(e) => setShowAnswers(e.target.checked)} /> Show answer key
                </label>
              </div>
              <PaperQuestions paper={detail} showAnswers={showAnswers} />
            </div>

            {detail.comments.length > 0 && (
              <div>
                <h4 className="text-xs text-secondary uppercase tracking-wider mb-2 font-semibold">Review history</h4>
                <ul className="flex flex-col gap-2">
                  {detail.comments.map((c) => (
                    <li key={c.id} className="text-sm bg-surface-container-low rounded-lg p-3">
                      <span className="font-semibold">{c.author?.full_name || c.author?.email}</span>
                      <span className="text-xs text-secondary"> · {c.kind.replace('_', ' ').toLowerCase()} · v{c.paper_version} · {timeAgo(c.created_at)}</span>
                      {c.body && <p className="mt-1">{c.body}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {detail.can_submit && (
              <div className="flex flex-col gap-2">
                <textarea className={`${textareaClass} h-16`} placeholder="Optional note for the reviewer..." value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 border-t border-outline-variant pt-4">
              <button onClick={() => download(detail.id, false)} className={secondaryButton}>
                <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span> PDF
              </button>
              <button onClick={() => download(detail.id, true)} className={secondaryButton}>
                <span className="material-symbols-outlined text-[18px]">key</span> PDF with answer key
              </button>
              {detail.can_edit && <button onClick={() => openEdit(detail)} className={secondaryButton}>Edit Blueprint</button>}
              {detail.can_delete && (
                <button onClick={() => setDeleteTarget(detail)} className={secondaryButton}>Delete</button>
              )}
              {detail.can_submit && (
                <button disabled={busy} onClick={() => act(() => papersApi.submit(detail.id, note.trim()), 'Paper submitted for HOD review.')} className={primaryButton}>
                  <span className="material-symbols-outlined text-[18px]">send</span> Submit for review
                </button>
              )}
            </div>
          </div>
        </Dialog>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Paper"
          message={<>Delete <strong>{deleteTarget.title}</strong>? This cannot be undone.</>}
          confirmLabel="Delete"
          busy={busy}
          onConfirm={confirmDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
