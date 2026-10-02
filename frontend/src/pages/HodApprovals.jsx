import React, { useCallback, useEffect, useState } from 'react';
import { papersApi } from '../api/platform';
import { notifyError } from '../api/errors';
import { PaperDistribution, PaperQuestions } from '../components/papers';
import { LoadError, Dialog, initials, StatusPill, timeAgo } from '../components/ui';
import { toast } from '../components/Toast';

const FILTERS = [
  ['PENDING_REVIEW', 'Pending review'], ['CHANGES_REQUESTED', 'Changes requested'], ['APPROVED', 'Approved'],
  ['REJECTED', 'Rejected'],
];
const KIND_LABEL = {
  COMMENT: 'commented', SUBMITTED: 'submitted for review', APPROVED: 'approved', REJECTED: 'rejected',
  CHANGES_REQUESTED: 'requested changes',
};

export default function HodApprovals() {
  const [filter, setFilter] = useState('PENDING_REVIEW');
  const [newestFirst, setNewestFirst] = useState(true);
  const [queue, setQueue] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [paper, setPaper] = useState(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [preview, setPreview] = useState(false);

  const loadQueue = useCallback(async () => {
    setFailed(false);
    setLoading(true);
    try {
      const result = await papersApi.list({ status: filter, page_size: 100 });
      setQueue(result.items);
      setCounts(result.status_counts);
      setActiveId((current) => (result.items.some((p) => p.id === current) ? current : result.items[0]?.id || null));
    } catch (err) {
      setFailed(true);
      notifyError(err, 'Failed to load the approval queue.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  useEffect(() => {
    if (!activeId) { setPaper(null); return; }
    let cancelled = false;
    papersApi.get(activeId)
      .then((p) => { if (!cancelled) setPaper(p); })
      .catch(async (err) => { if (!cancelled) notifyError(err, 'Failed to load the paper.'); });
    return () => { cancelled = true; };
  }, [activeId]);

  const sorted = [...queue].sort((a, b) => {
    const ta = new Date(a.submitted_at || a.updated_at).getTime();
    const tb = new Date(b.submitted_at || b.updated_at).getTime();
    return newestFirst ? tb - ta : ta - tb;
  });

  const postComment = async () => {
    if (!comment.trim()) return;
    setBusy(true);
    try {
      setPaper(await papersApi.comment(paper.id, comment.trim()));
      setComment('');
    } catch (err) {
      notifyError(err, 'Could not post the comment.');
    } finally {
      setBusy(false);
    }
  };

  const decide = async (decision) => {
    if (decision !== 'APPROVE' && comment.trim().length < 3) {
      toast.error('Add a comment explaining why before rejecting or requesting changes.');
      return;
    }
    setBusy(true);
    try {
      const updated = await papersApi.review(paper.id, decision, comment.trim());
      setComment('');
      toast.success({ APPROVE: 'Paper approved and finalized.', REJECT: 'Paper rejected.',
                  REQUEST_CHANGES: 'Changes requested — the paper was returned to its author.' }[decision]);
      setPaper(updated);
      await loadQueue();
    } catch (err) {
      notifyError(err, 'The review could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  const download = async (withAnswers) => {
    try { await papersApi.downloadPdf(paper.id, withAnswers); } catch (err) { notifyError(err, 'Download failed.'); }
  };

  const reviewBlockedReason = paper && !paper.can_review && paper.status === 'PENDING_REVIEW'
    ? 'You cannot review this paper (you created it, or your role lacks approval permission).'
    : null;

  return (
    <div className="flex-1 overflow-y-auto p-margin-mobile md:p-gutter flex flex-col gap-6 h-full max-w-container-max mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-on-surface">Paper Approvals</h2>
          <p className="text-sm text-on-surface-variant mt-1">Review question papers before they are finalized.</p>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}
                className="h-9 px-3 rounded-lg border border-outline-variant text-on-surface-variant text-sm bg-surface-container-lowest outline-none focus:border-primary">
          {FILTERS.map(([key, label]) => <option key={key} value={key}>{label} ({counts[key] ?? 0})</option>)}
        </select>
      </div>
      {failed && <LoadError what="the approval queue" onRetry={loadQueue} />}

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-[600px]">
        {/* Queue */}
        <div className="w-full lg:w-[360px] xl:w-[400px] flex flex-col bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden shrink-0">
          <div className="p-4 border-b border-outline-variant bg-surface flex justify-between items-center">
            <span className="text-sm text-secondary uppercase tracking-wider font-semibold">Queue ({queue.length})</span>
            <button onClick={() => setNewestFirst(!newestFirst)} className="text-primary hover:underline text-xs font-medium">
              {newestFirst ? 'Newest first' : 'Oldest first'}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="p-4 text-sm text-secondary">Loading...</p>
            ) : sorted.length === 0 ? (
              <p className="p-6 text-sm text-secondary text-center">Nothing here. Papers submitted for review appear in this queue.</p>
            ) : sorted.map((p) => (
              <button key={p.id} onClick={() => setActiveId(p.id)}
                      className={`w-full text-left p-4 border-b border-outline-variant transition-colors ${activeId === p.id ? 'bg-surface-container border-l-4 border-l-primary' : 'bg-surface-container-lowest hover:bg-surface-container'}`}>
                <div className="flex justify-between items-start mb-1 gap-2">
                  <h3 className="text-base font-semibold text-on-surface">{p.title}</h3>
                  <StatusPill status={p.status} />
                </div>
                <p className="text-sm text-on-surface-variant line-clamp-1 mb-2">{p.subject_code} — {p.subject_name}</p>
                <div className="flex items-center gap-1 text-on-surface-variant">
                  <div className="w-5 h-5 rounded-full bg-secondary text-white flex items-center justify-center text-[10px] font-bold">
                    {initials(p.created_by?.full_name || p.created_by?.email)}
                  </div>
                  <span className="text-xs font-medium">{p.created_by?.full_name || p.created_by?.email}</span>
                  <span className="mx-1 text-outline-variant">•</span>
                  <span className="text-xs font-medium">{timeAgo(p.submitted_at || p.updated_at)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className="flex-1 flex flex-col bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          {!paper ? (
            <div className="flex-1 flex items-center justify-center text-secondary text-sm p-8">Select a paper to review.</div>
          ) : (
            <>
              <div className="p-6 border-b border-outline-variant flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container text-xs font-medium">{paper.subject_code}</span>
                    <h2 className="text-xl font-semibold text-on-surface">{paper.title}</h2>
                  </div>
                  <p className="text-sm text-on-surface-variant">
                    {paper.exam_type} · Submitted by {paper.created_by?.full_name || paper.created_by?.email} · Version {paper.version}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setPreview(true)} className="flex items-center gap-1 px-4 py-2 rounded-lg border border-outline-variant text-on-surface text-sm font-medium hover:bg-surface-container bg-surface-container-lowest shadow-sm">
                    <span className="material-symbols-outlined text-[18px]">visibility</span> Preview Paper
                  </button>
                  <button onClick={() => download(true)} className="flex items-center gap-1 px-3 py-2 rounded-lg border border-outline-variant text-on-surface text-sm hover:bg-surface-container bg-surface-container-lowest shadow-sm" title="PDF with answer key">
                    <span className="material-symbols-outlined text-[18px]">download</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
                <div>
                  <h4 className="text-xs text-secondary uppercase tracking-wider mb-2 font-semibold">Blueprint ({paper.question_count} questions)</h4>
                  <PaperDistribution paper={paper} />
                </div>

                <div>
                  <h4 className="text-xs text-secondary uppercase tracking-wider mb-2 font-semibold">Feedback & Comments</h4>
                  <div className="bg-surface-container-low rounded-lg p-4 border border-outline-variant">
                    {paper.comments.map((c) => (
                      <div key={c.id} className="flex gap-2 mb-4 pb-4 border-b border-outline-variant">
                        <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center text-xs font-bold shrink-0 mt-1">
                          {initials(c.author?.full_name || c.author?.email)}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-sm font-semibold text-on-surface">{c.author?.full_name || c.author?.email}</span>
                            <span className="text-[11px] text-on-surface-variant">{KIND_LABEL[c.kind]} · v{c.paper_version} · {timeAgo(c.created_at)}</span>
                          </div>
                          {c.body && <p className="text-sm text-on-surface mt-1 whitespace-pre-wrap">{c.body}</p>}
                        </div>
                      </div>
                    ))}
                    <textarea
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-sm text-on-surface focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none outline-none"
                      placeholder="Add a comment, or explain your decision (required to reject or request changes)..."
                      rows="3"
                      maxLength={2000}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                    <div className="flex justify-end mt-2">
                      <button onClick={postComment} disabled={busy || !comment.trim()} className="px-4 py-1.5 bg-surface text-secondary border border-outline-variant rounded-lg text-sm font-medium hover:bg-surface-container disabled:opacity-50 shadow-sm">
                        Post Comment
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {paper.status === 'PENDING_REVIEW' && (
                <div className="p-4 border-t border-outline-variant bg-surface flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                  <div className="text-on-surface-variant text-xs font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">info</span>
                    {reviewBlockedReason || 'Approving finalizes the paper; it can no longer be edited.'}
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button onClick={() => decide('REJECT')} disabled={busy || !paper.can_review}
                            className="flex-1 sm:flex-none px-4 py-2 border border-[#EF4444] text-[#EF4444] bg-surface-container-lowest hover:bg-[#FEF2F2] rounded-lg text-sm font-medium disabled:opacity-50">
                      Reject
                    </button>
                    <button onClick={() => decide('REQUEST_CHANGES')} disabled={busy || !paper.can_review}
                            className="flex-1 sm:flex-none px-4 py-2 border border-outline-variant text-on-surface bg-surface-container-lowest hover:bg-surface-container rounded-lg text-sm font-medium shadow-sm disabled:opacity-50">
                      Request Changes
                    </button>
                    <button onClick={() => decide('APPROVE')} disabled={busy || !paper.can_review}
                            className="flex-1 sm:flex-none px-6 py-2 bg-primary text-on-primary hover:bg-primary/90 rounded-lg text-sm font-medium shadow-sm flex items-center justify-center gap-1 disabled:opacity-50">
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                      Approve Paper
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {preview && paper && (
        <Dialog title={`${paper.title} — preview`} onClose={() => setPreview(false)} width="max-w-3xl">
          <div className="p-5"><PaperQuestions paper={paper} showAnswers /></div>
        </Dialog>
      )}
    </div>
  );
}
