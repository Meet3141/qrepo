import React, { useState } from 'react';
import { aiService } from '../api/ai';
import { notifyError } from '../api/errors';
import { toast } from './Toast';
import { BLOOM_LEVELS, DIFFICULTIES } from './paperConstants';
import { Dialog, Field, FieldGroup, enumLabel, inputClass, primaryButton, secondaryButton, textareaClass } from './ui';

/** Backend RejectionReason enum (app/ai/schemas.py). */
const REJECTION_REASONS = ['INCORRECT', 'AMBIGUOUS', 'OFF_TOPIC', 'WRONG_DIFFICULTY', 'WRONG_BLOOM_LEVEL', 'DUPLICATE', 'POOR_LANGUAGE', 'OTHER'];

const REVIEW_STYLES = {
  VALIDATED: 'bg-primary-container text-on-primary-container',
  EDITED: 'bg-secondary-container text-on-secondary-container',
  REJECTED: 'bg-error-container text-on-error-container',
};
const reviewStatusClass = (status) => REVIEW_STYLES[status] || 'bg-surface-variant text-on-surface-variant';

const editableFields = (d) => ({
  question_text: d.question_text || '',
  difficulty: d.difficulty,
  bloom_level: d.bloom_level,
  marks: d.marks ?? '',
  options: d.options ? [...d.options] : null,
  correct_option_index: d.correct_option_index ?? null,
  expected_answer: d.expected_answer || '',
  explanation: d.explanation || '',
});

const normalize = (key, value) => {
  if (key === 'marks') return value === '' || value == null ? null : Number(value);
  if (key === 'options') return value ? value.map((o) => o.trim()) : null;
  return typeof value === 'string' ? value.trim() : value;
};

/** Only send fields that actually changed (the backend rejects an EDIT without changes). */
function diffEdits(original, edited) {
  const changes = {};
  for (const key of Object.keys(edited)) {
    const next = normalize(key, edited[key]);
    if (key === 'marks' && next === null) continue;
    if (JSON.stringify(next) !== JSON.stringify(normalize(key, original[key]))) changes[key] = next;
  }
  return changes;
}

/**
 * Accept, edit or reject an AI question draft (POST /ai/drafts/{id}/review).
 * Calls onReviewed(updatedDraft) after the backend saves the review.
 */
export default function DraftReviewDialog({ draft, onClose, onReviewed }) {
  const [action, setAction] = useState('ACCEPT');
  const [edits, setEdits] = useState(() => editableFields(draft));
  const [rejectionReason, setRejectionReason] = useState('');
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const payload = { action };
    if (comment.trim()) payload.comment = comment.trim();
    if (rating) payload.rating = Number(rating);
    if (action === 'REJECT') {
      if (!rejectionReason) return toast.error('Choose a reason for rejecting this question.');
      payload.rejection_reason = rejectionReason;
    }
    if (action === 'EDIT') {
      const changes = diffEdits(editableFields(draft), edits);
      if (!Object.keys(changes).length) return toast.error('Make at least one change, or choose Accept instead.');
      if (changes.options && changes.options.some((o) => !o)) return toast.error('Options cannot be empty.');
      payload.edits = changes;
    }
    setSaving(true);
    try {
      const updated = await aiService.reviewDraft(draft.id, payload);
      toast.success({ ACCEPT: 'Question accepted into the question bank.', EDIT: 'Edited question saved to the question bank.',
                      REJECT: 'Question rejected.' }[action]);
      onReviewed(updated);
    } catch (err) {
      notifyError(err, 'The review could not be saved.');
      setSaving(false);
    }
  };

  const set = (key) => (e) => setEdits({ ...edits, [key]: e.target.value });

  return (
    <Dialog title="Review Question Draft" onClose={onClose} width="max-w-lg">
      <form onSubmit={submit} className="p-4 flex flex-col gap-4">
        <p className="text-sm text-on-surface line-clamp-3"><strong>Q{draft.position}.</strong> {draft.question_text}</p>

        <FieldGroup label="Decision">
          <div className="grid grid-cols-3 gap-2">
            {[['ACCEPT', 'Accept'], ['EDIT', 'Edit & accept'], ['REJECT', 'Reject']].map(([value, label]) => (
              <label key={value} className={`text-[13px] text-center py-2 rounded-lg border cursor-pointer transition-colors ${action === value ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low'}`}>
                <input type="radio" name="review-action" value={value} checked={action === value} onChange={() => setAction(value)} className="sr-only" />
                {label}
              </label>
            ))}
          </div>
        </FieldGroup>

        {action === 'EDIT' && (
          <div className="flex flex-col gap-3 border border-outline-variant rounded-lg p-3">
            <Field label="Question text">
              <textarea className={`${textareaClass} h-24`} value={edits.question_text} maxLength={4000} onChange={set('question_text')} />
            </Field>
            {edits.options && (
              <FieldGroup label="Options (select the correct one)">
                <div className="flex flex-col gap-1.5">
                  {edits.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input type="radio" name="correct-option" checked={edits.correct_option_index === i}
                             onChange={() => setEdits({ ...edits, correct_option_index: i })}
                             aria-label={`Option ${String.fromCharCode(65 + i)} is correct`} />
                      <input className={`${inputClass} h-9`} value={opt} aria-label={`Option ${String.fromCharCode(65 + i)}`}
                             onChange={(e) => setEdits({ ...edits, options: edits.options.map((o, j) => (j === i ? e.target.value : o)) })} />
                    </div>
                  ))}
                </div>
              </FieldGroup>
            )}
            {!edits.options && (
              <Field label="Expected answer">
                <textarea className={`${textareaClass} h-20`} value={edits.expected_answer} maxLength={8000} onChange={set('expected_answer')} />
              </Field>
            )}
            <Field label="Explanation">
              <textarea className={`${textareaClass} h-16`} value={edits.explanation} maxLength={4000} onChange={set('explanation')} />
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Difficulty">
                <select className={inputClass} value={edits.difficulty} onChange={set('difficulty')}>
                  {DIFFICULTIES.map((d) => <option key={d} value={d}>{enumLabel(d)}</option>)}
                </select>
              </Field>
              <Field label="Bloom level">
                <select className={inputClass} value={edits.bloom_level} onChange={set('bloom_level')}>
                  {BLOOM_LEVELS.map((b) => <option key={b} value={b}>{enumLabel(b)}</option>)}
                </select>
              </Field>
              <Field label="Marks">
                <input type="number" min="0" max="100" step="0.5" className={inputClass} value={edits.marks} onChange={set('marks')} />
              </Field>
            </div>
          </div>
        )}

        {action === 'REJECT' && (
          <Field label="Rejection reason *">
            <select className={inputClass} value={rejectionReason} required onChange={(e) => setRejectionReason(e.target.value)}>
              <option value="">Select reason</option>
              {REJECTION_REASONS.map((r) => <option key={r} value={r}>{enumLabel(r)}</option>)}
            </select>
          </Field>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Field label="Comment (optional)">
              <textarea className={`${textareaClass} h-16`} value={comment} maxLength={1000} placeholder="Optional feedback..."
                        onChange={(e) => setComment(e.target.value)} />
            </Field>
          </div>
          <Field label="Rating (optional)">
            <select className={inputClass} value={rating} onChange={(e) => setRating(e.target.value)}>
              <option value="">No rating</option>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} / 5</option>)}
            </select>
          </Field>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryButton}>Cancel</button>
          <button type="submit" disabled={saving} className={primaryButton}>{saving ? 'Submitting...' : 'Submit Review'}</button>
        </div>
      </form>
    </Dialog>
  );
}

/** One AI question draft with its answer key and review status. */
export function DraftCard({ draft: q, onReview }) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4">
      <div className="flex items-start gap-3">
        <span className="text-sm font-bold text-secondary mt-0.5">Q{q.position}.</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-on-surface mb-2 whitespace-pre-line">{q.question_text}</p>
          {q.options?.length > 0 && (
            <div className="mb-2 flex flex-col gap-1">
              {q.options.map((opt, oi) => (
                <div key={oi} className={`text-xs px-2 py-1 rounded ${oi === q.correct_option_index ? 'bg-primary-container text-on-primary-container font-semibold' : 'bg-surface-container text-on-surface-variant'}`}>
                  {String.fromCharCode(65 + oi)}. {opt} {oi === q.correct_option_index && '✓'}
                </div>
              ))}
            </div>
          )}
          {q.expected_answer && (
            <div className="mb-2 text-xs text-secondary bg-surface-container rounded p-2">
              <span className="font-semibold">Expected Answer: </span>{q.expected_answer}
            </div>
          )}
          {q.explanation && (
            <div className="mb-2 text-xs text-secondary bg-surface-container rounded p-2">
              <span className="font-semibold">Explanation: </span>{q.explanation}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${q.difficulty === 'HARD' ? 'bg-error-container text-on-error-container' : q.difficulty === 'EASY' ? 'bg-surface-variant text-on-surface-variant' : 'bg-secondary-container text-on-secondary-container'}`}>
              {q.difficulty}
            </span>
            <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant text-[10px] font-medium">{q.bloom_level}</span>
            <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant text-[10px] font-medium">{q.marks} marks</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${reviewStatusClass(q.faculty_review_status)}`}>
              {q.faculty_review_status}
            </span>
            {q.faculty_review_status === 'DRAFT' && onReview && (
              <button onClick={() => onReview(q)} className="ml-auto text-primary text-xs font-semibold hover:underline flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">rate_review</span>
                Review
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
