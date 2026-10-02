import React, { useState } from 'react';
import { toast } from './Toast';
import { Field, FieldGroup, enumLabel, inputClass, primaryButton, secondaryButton, textareaClass } from './ui';

import { BLOOM_LEVELS, DIFFICULTIES, QUESTION_TYPES } from './paperConstants';
const DIFFICULTY_COLORS = { EASY: '#4ADE80', MEDIUM: '#FBBF24', HARD: '#EF4444' };

/** Difficulty curve + Bloom bars + headline numbers for a paper. */
export function PaperDistribution({ paper }) {
  const d = paper.distribution;
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon="format_list_numbered" value={d.total_marks} label="Total Marks" />
        <Stat icon="schedule" value={paper.duration_minutes} label="Minutes" />
        <div className="col-span-2 bg-surface-container-low border border-outline-variant rounded-lg p-4 flex flex-col justify-center">
          <div className="flex items-center gap-1 mb-2">
            <span className="material-symbols-outlined text-secondary text-[18px]">psychology</span>
            <span className="text-sm font-semibold text-on-surface">Difficulty Curve</span>
          </div>
          <div className="flex h-3 w-full rounded-full overflow-hidden bg-surface-variant">
            {DIFFICULTIES.map((k) => (
              <div key={k} className="h-full" style={{ width: `${d.difficulty[k] || 0}%`, background: DIFFICULTY_COLORS[k] }}
                   title={`${enumLabel(k)} ${d.difficulty[k] || 0}%`} />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[11px] font-medium text-on-surface-variant">
            {DIFFICULTIES.map((k) => <span key={k}>{enumLabel(k)} ({Math.round(d.difficulty[k] || 0)}%)</span>)}
          </div>
        </div>
      </div>
      <div>
        <h4 className="text-xs text-secondary uppercase tracking-wider mb-2 font-semibold">Bloom's Taxonomy Distribution</h4>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-3">
          {BLOOM_LEVELS.map((k) => (
            <div key={k} className="flex items-center gap-4">
              <div className="w-24 text-sm text-on-surface font-medium">{enumLabel(k)}</div>
              <div className="flex-1 h-2 rounded-full bg-surface-variant overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${d.bloom[k] || 0}%` }} />
              </div>
              <div className="w-12 text-right text-sm text-on-surface-variant">{Math.round(d.bloom[k] || 0)}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, value, label }) {
  return (
    <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4 flex flex-col items-center justify-center text-center">
      <span className="material-symbols-outlined text-secondary mb-1">{icon}</span>
      <span className="text-[28px] font-bold text-on-surface leading-tight">{value}</span>
      <span className="text-xs text-on-surface-variant">{label}</span>
    </div>
  );
}

/** Rendered question list. Answer keys only when `showAnswers` (staff views only). */
export function PaperQuestions({ paper, showAnswers }) {
  return (
    <ol className="flex flex-col gap-4">
      {paper.questions.map((q) => (
        <li key={q.id} className="border border-outline-variant rounded-lg p-4 bg-surface-container-lowest">
          <div className="flex justify-between gap-4">
            <p className="text-sm text-on-surface"><strong>Q{q.position}.</strong> {q.question_text}</p>
            <span className="text-xs text-secondary shrink-0">[{q.marks}]</span>
          </div>
          {q.options && (
            <ol className="mt-2 ml-6 text-sm text-on-surface-variant list-[upper-alpha] space-y-0.5">
              {q.options.map((o, i) => (
                <li key={i} className={showAnswers && i === q.correct_option_index ? 'text-primary font-semibold' : ''}>
                  {o}{showAnswers && i === q.correct_option_index ? ' ✓' : ''}
                </li>
              ))}
            </ol>
          )}
          {showAnswers && q.expected_answer && (
            <p className="mt-2 text-xs text-on-surface-variant"><strong>Model answer:</strong> {q.expected_answer}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-1 text-[10px] uppercase font-semibold">
            {[q.question_type, q.difficulty, q.bloom_level].map((t) => (
              <span key={t} className="px-1.5 py-0.5 rounded bg-surface-variant text-on-surface-variant">{enumLabel(t)}</span>
            ))}
          </div>
        </li>
      ))}
    </ol>
  );
}

const pctFields = (keys, values, onChange) => (
  <div className="grid grid-cols-3 gap-2">
    {keys.map((k) => (
      <label key={k} className="text-[11px] text-on-surface-variant">
        {enumLabel(k)}
        <div className="relative">
          <input type="number" min="0" max="100" className={`${inputClass} h-9 pr-6`} value={values[k] ?? 0}
                 onChange={(e) => onChange({ ...values, [k]: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-outline">%</span>
        </div>
      </label>
    ))}
  </div>
);

const sum = (obj) => Object.values(obj).reduce((a, b) => a + (Number(b) || 0), 0);

/**
 * Create/edit form for a paper and its blueprint. On edit, `rebuild` re-selects questions
 * from the question bank using the new blueprint.
 */
export function PaperForm({ paper, subjects, initialBlueprint, onSubmit, onCancel, busy }) {
  const bp = paper?.blueprint || initialBlueprint || {};
  const [form, setForm] = useState({
    title: paper?.title || '',
    subject_id: paper?.subject_id || initialBlueprint?.subject_id || subjects?.[0]?.id || '',
    exam_type: paper?.exam_type || 'Midterm',
    duration_minutes: paper?.duration_minutes || 60,
    instructions: paper?.instructions || '',
  });
  const [count, setCount] = useState(bp.question_count || 10);
  const [types, setTypes] = useState(bp.question_types || []);
  const [difficulty, setDifficulty] = useState(bp.difficulty_mix || { EASY: 30, MEDIUM: 50, HARD: 20 });
  const [useBloom, setUseBloom] = useState(Boolean(bp.bloom_mix));
  const [bloom, setBloom] = useState(bp.bloom_mix || { REMEMBER: 17, UNDERSTAND: 17, APPLY: 17, ANALYZE: 17, EVALUATE: 16, CREATE: 16 });
  const [rebuild, setRebuild] = useState(!paper);

  const blueprintChanged = !paper || JSON.stringify({ count, types, difficulty, bloom: useBloom ? bloom : null }) !==
    JSON.stringify({ count: bp.question_count, types: bp.question_types || [], difficulty: bp.difficulty_mix, bloom: bp.bloom_mix || null });

  const submit = (e) => {
    e.preventDefault();
    if (sum(difficulty) !== 100) return toast.error(`Difficulty mix must add up to 100% (currently ${sum(difficulty)}%).`);
    if (useBloom && sum(bloom) !== 100) return toast.error(`Bloom mix must add up to 100% (currently ${sum(bloom)}%).`);
    const blueprint = {
      question_count: Number(count),
      difficulty_mix: Object.fromEntries(Object.entries(difficulty).filter(([, v]) => v > 0)),
      bloom_mix: useBloom ? Object.fromEntries(Object.entries(bloom).filter(([, v]) => v > 0)) : null,
      ...(types.length ? { question_types: types } : {}),
      ...(bp.unit_ids ? { unit_ids: bp.unit_ids } : {}),
    };
    const body = { title: form.title.trim(), exam_type: form.exam_type.trim(), duration_minutes: Number(form.duration_minutes),
                   instructions: form.instructions.trim() || null };
    if (paper) onSubmit({ ...body, ...(blueprintChanged ? { blueprint, rebuild } : {}) });
    else onSubmit({ ...body, subject_id: form.subject_id, blueprint });
  };

  return (
    <form onSubmit={submit} className="p-4 flex flex-col gap-4">
      <Field label="Title *">
        <input className={inputClass} value={form.title} minLength={3} required onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        {!paper && (
          <Field label="Subject *">
            <select className={inputClass} value={form.subject_id} required onChange={(e) => setForm({ ...form, subject_id: e.target.value })}>
              {(subjects || []).map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Exam type">
          <input className={inputClass} value={form.exam_type} onChange={(e) => setForm({ ...form, exam_type: e.target.value })} />
        </Field>
        <Field label="Duration (min)">
          <input type="number" min="5" max="600" className={inputClass} value={form.duration_minutes}
                 onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} />
        </Field>
      </div>
      <Field label="Instructions">
        <textarea className={`${textareaClass} h-16`} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
      </Field>

      <fieldset className="border border-outline-variant rounded-lg p-3 flex flex-col gap-3">
        <legend className="px-1 text-[11px] font-semibold text-on-surface">Blueprint</legend>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Number of questions">
            <input type="number" min="1" max="100" className={inputClass} value={count} onChange={(e) => setCount(e.target.value)} />
          </Field>
          <FieldGroup label="Question types" hint="None selected = any type">
            <div className="flex flex-wrap gap-2 pt-1">
              {QUESTION_TYPES.map((t) => (
                <label key={t} className="text-xs flex items-center gap-1">
                  <input type="checkbox" checked={types.includes(t)}
                         onChange={(e) => setTypes(e.target.checked ? [...types, t] : types.filter((x) => x !== t))} />
                  {enumLabel(t)}
                </label>
              ))}
            </div>
          </FieldGroup>
        </div>
        <FieldGroup label={`Difficulty mix (${sum(difficulty)}%)`}>{pctFields(DIFFICULTIES, difficulty, setDifficulty)}</FieldGroup>
        <label className="text-xs flex items-center gap-2">
          <input type="checkbox" checked={useBloom} onChange={(e) => setUseBloom(e.target.checked)} />
          Set a Bloom's taxonomy mix (otherwise spread evenly across available levels)
        </label>
        {useBloom && <FieldGroup label={`Bloom mix (${sum(bloom)}%)`}>{pctFields(BLOOM_LEVELS, bloom, setBloom)}</FieldGroup>}
        {paper && blueprintChanged && (
          <label className="text-xs flex items-center gap-2 text-on-surface">
            <input type="checkbox" checked={rebuild} onChange={(e) => setRebuild(e.target.checked)} />
            Re-select questions from the question bank using this blueprint
          </label>
        )}
        <p className="text-[11px] text-on-surface-variant">Questions are chosen only from AI drafts that faculty accepted in the Question Bank.</p>
      </fieldset>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={secondaryButton}>Cancel</button>
        <button type="submit" disabled={busy} className={primaryButton}>{busy ? 'Working...' : paper ? 'Save' : 'Build paper'}</button>
      </div>
    </form>
  );
}
