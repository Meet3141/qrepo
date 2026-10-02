import React, { useCallback, useState, useEffect } from 'react';
import { aiService } from '../api/ai';
import { subjectService } from '../api/subjects';
import { unitService } from '../api/units';
import { notifyError } from '../api/errors';
import { PERMISSIONS } from '../api/session';
import Modal from '../components/Modal';
import DraftReviewDialog, { DraftCard } from '../components/DraftReview';
import { useSession } from '../components/Session';
import { toast } from '../components/Toast';
import { LoadError } from '../components/ui';

export default function QuestionBank() {
  const { can } = useSession();
  const canGenerate = can(PERMISSIONS.AI_GENERATE_QUESTIONS) !== false;
  const [generations, setGenerations] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    subject_id: '',
    limit: 20
  });

  // Expanded generation (to view drafts)
  const [expandedGen, setExpandedGen] = useState(null);
  const [expandedLoading, setExpandedLoading] = useState(false);

  // Generation Modal State
  const [showGenModal, setShowGenModal] = useState(false);
  const [genParams, setGenParams] = useState({
    subject_id: '',
    unit_id: '',
    number_of_questions: 5,
    difficulty: 'MEDIUM',
    question_type: 'MCQ',
    bloom_level: 'APPLY',
    topic: '',
    target_audience: ''
  });
  const [genLoading, setGenLoading] = useState(false);

  // Review modal
  const [reviewDraft, setReviewDraft] = useState(null);

  useEffect(() => {
    subjectService.getSubjects().then(setSubjects).catch((err) => notifyError(err, 'Failed to load subjects.'));
  }, []);

  const fetchUnits = async (subjectId) => {
    try {
      setUnits(await unitService.getUnitsBySubject(subjectId));
    } catch (err) {
      setUnits([]);
      notifyError(err, 'Failed to load units.');
    }
  };

  const fetchGenerations = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      setGenerations(await aiService.listGenerations({ subject_id: filters.subject_id, limit: Number(filters.limit) }));
    } catch (err) {
      setFailed(true);
      notifyError(err, 'Failed to load generations.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchGenerations(); }, [fetchGenerations]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({ subject_id: '', limit: 20 });
  };

  const handleExpandGeneration = async (genId) => {
    if (expandedGen?.generation_id === genId) {
      setExpandedGen(null);
      return;
    }
    setExpandedLoading(true);
    try {
      setExpandedGen(await aiService.getGeneration(genId));
    } catch (err) {
      notifyError(err, 'Failed to load the generated questions.');
    } finally {
      setExpandedLoading(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (genLoading) return;
    setGenLoading(true);

    const payload = {
      subject_id: genParams.subject_id,
      question_type: genParams.question_type,
      difficulty: genParams.difficulty,
      bloom_level: genParams.bloom_level,
      number_of_questions: parseInt(genParams.number_of_questions, 10),
      topic: genParams.topic,
      target_audience: genParams.target_audience,
    };
    if (genParams.unit_id) {
      payload.unit_id = genParams.unit_id;
    }

    try {
      const generation = await aiService.generateQuestions(payload);
      setShowGenModal(false);
      toast.success(`${generation.questions?.length || 0} question drafts generated. Review them below.`);
      setExpandedGen(generation);
      await fetchGenerations();
    } catch (err) {
      notifyError(err, 'Question generation failed.');
    } finally {
      setGenLoading(false);
    }
  };

  const handleReviewed = (updated) => {
    setReviewDraft(null);
    setExpandedGen((gen) => gen && {
      ...gen,
      questions: gen.questions.map((q) => (q.id === updated.id ? updated : q)),
    });
  };

  const statusColor = (status) => {
    if (status === 'SUCCESS') return 'bg-primary-container text-on-primary-container';
    if (status === 'REJECTED') return 'bg-error-container text-on-error-container';
    if (status === 'FAILED') return 'bg-error-container text-on-error-container';
    return 'bg-surface-variant text-on-surface-variant';
  };

  return (
    <div className="max-w-[1280px] mx-auto w-full flex flex-col gap-6 relative">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-on-surface">Question Bank</h2>
          <p className="text-secondary mt-1 text-sm">Manage AI-generated question drafts and faculty reviews.</p>
        </div>
        <div className="flex gap-2">
          {canGenerate && <button onClick={() => setShowGenModal(true)} className="bg-primary text-on-primary font-medium text-sm px-4 py-2 rounded-lg shadow-sm hover:bg-primary/90 transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            Generate Questions
          </button>}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-secondary">Subject</label>
            <select name="subject_id" value={filters.subject_id} onChange={handleFilterChange} className="h-[40px] bg-surface-container-low border border-transparent focus:border-primary rounded-lg text-sm px-3 outline-none">
              <option value="">All Subjects</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-secondary">Results Limit</label>
            <select name="limit" value={filters.limit} onChange={handleFilterChange} className="h-[40px] bg-surface-container-low border border-transparent focus:border-primary rounded-lg text-sm px-3 outline-none">
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={clearFilters} className="h-[40px] px-4 w-full text-sm font-medium text-primary hover:bg-surface-container rounded-lg transition-colors border border-outline-variant">
              Clear All
            </button>
          </div>
        </div>
      </div>

      {failed && <LoadError what="generated questions" onRetry={fetchGenerations} />}

      {/* Generations List */}
      {loading ? (
        <div className="flex justify-center p-12">
          <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
        </div>
      ) : failed ? null : generations.length === 0 ? (
        <div className="text-center p-12 bg-surface-container-lowest border border-outline-variant rounded-xl text-secondary">
          No generations found. Generate questions using the button above.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {generations.map(g => (
            <div key={g.generation_id} className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
              {/* Generation Summary Row */}
              <button
                onClick={() => handleExpandGeneration(g.generation_id)}
                className="w-full text-left p-4 flex items-center gap-4 hover:bg-surface-container-low/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColor(g.status)}`}>
                      {g.status}
                    </span>
                    {g.validation_status && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-surface-variant text-on-surface-variant">
                        {g.validation_status}
                      </span>
                    )}
                    {g.quality_score != null && (
                      <span className="text-[11px] text-secondary font-medium">
                        Quality: {(g.quality_score * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-on-surface">
                    {[`${g.question_count} question${g.question_count !== 1 ? 's' : ''}`, g.parameters?.topic, g.parameters?.question_type, g.parameters?.difficulty].filter(Boolean).join(' • ')}
                  </p>
                  <p className="text-xs text-secondary mt-0.5">
                    {new Date(g.created_at).toLocaleString()}
                  </p>
                </div>
                <span className="material-symbols-outlined text-outline text-[20px] shrink-0">
                  {expandedGen?.generation_id === g.generation_id ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {/* Expanded Drafts */}
              {expandedGen?.generation_id === g.generation_id && (
                <div className="border-t border-outline-variant p-4 bg-surface-container/30">
                  {expandedLoading ? (
                    <div className="flex justify-center p-4">
                      <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {/* Metadata */}
                      {expandedGen.metadata && (
                        <div className="flex flex-wrap gap-3 text-[11px] text-secondary mb-2">
                          <span>Model: {expandedGen.model}</span>
                          <span>Latency: {expandedGen.metadata.latency_ms}ms</span>
                          <span>Attempts: {expandedGen.metadata.generation_attempts}</span>
                          {expandedGen.metadata.repair_attempted && <span className="text-tertiary font-semibold">Repair attempted</span>}
                          {expandedGen.metadata.context_available && <span>Context: {expandedGen.metadata.context_sections_used} sections</span>}
                        </div>
                      )}
                      {expandedGen.questions?.map((q) => (
                        <DraftCard key={q.id} draft={q} onReview={setReviewDraft} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Generation Modal */}
      {showGenModal && (
        <Modal onClose={() => setShowGenModal(false)}>
          <div className="bg-surface-container-lowest rounded-xl shadow-lg p-6 min-w-[90vw] md:min-w-[32rem] max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">auto_awesome</span>
                Generate AI Questions
              </h3>
              <button onClick={() => setShowGenModal(false)} className="text-secondary hover:text-on-surface"><span className="material-symbols-outlined">close</span></button>
            </div>

            <form onSubmit={handleGenerate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold">Subject *</label>
                <select required value={genParams.subject_id} onChange={e => { setGenParams({...genParams, subject_id: e.target.value, unit_id: ''}); if (e.target.value) fetchUnits(e.target.value); else setUnits([]); }} className="h-[40px] bg-surface-container border border-outline-variant rounded-lg px-3 outline-none">
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold">Unit (Optional)</label>
                <select value={genParams.unit_id} onChange={e => setGenParams({...genParams, unit_id: e.target.value})} disabled={!genParams.subject_id} className="h-[40px] bg-surface-container border border-outline-variant rounded-lg px-3 outline-none disabled:opacity-50">
                  <option value="">All Units</option>
                  {units.map(u => <option key={u.id} value={u.id}>Unit {u.unit_number}: {u.title}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold">Topic *</label>
                <input type="text" required minLength={2} maxLength={200} placeholder="e.g. Sorting Algorithms" value={genParams.topic} onChange={e => setGenParams({...genParams, topic: e.target.value})} className="h-[40px] bg-surface-container border border-outline-variant rounded-lg px-3 outline-none" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold">Target Audience *</label>
                <input type="text" required minLength={2} maxLength={100} placeholder="e.g. 3rd year B.Tech CS students" value={genParams.target_audience} onChange={e => setGenParams({...genParams, target_audience: e.target.value})} className="h-[40px] bg-surface-container border border-outline-variant rounded-lg px-3 outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold">Count</label>
                  <select required value={genParams.number_of_questions} onChange={e => setGenParams({...genParams, number_of_questions: e.target.value})} className="h-[40px] bg-surface-container border border-outline-variant rounded-lg px-3 outline-none">
                    <option value="5">5</option>
                    <option value="6">6</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold">Type</label>
                  <select value={genParams.question_type} onChange={e => setGenParams({...genParams, question_type: e.target.value})} className="h-[40px] bg-surface-container border border-outline-variant rounded-lg px-3 outline-none">
                    <option value="MCQ">MCQ</option>
                    <option value="SHORT_ANSWER">Short Answer</option>
                    <option value="LONG_ANSWER">Long Answer</option>
                    <option value="TRUE_FALSE">True / False</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold">Difficulty</label>
                  <select value={genParams.difficulty} onChange={e => setGenParams({...genParams, difficulty: e.target.value})} className="h-[40px] bg-surface-container border border-outline-variant rounded-lg px-3 outline-none">
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold">Bloom's Level</label>
                  <select value={genParams.bloom_level} onChange={e => setGenParams({...genParams, bloom_level: e.target.value})} className="h-[40px] bg-surface-container border border-outline-variant rounded-lg px-3 outline-none">
                    <option value="REMEMBER">Remember</option>
                    <option value="UNDERSTAND">Understand</option>
                    <option value="APPLY">Apply</option>
                    <option value="ANALYZE">Analyze</option>
                    <option value="EVALUATE">Evaluate</option>
                    <option value="CREATE">Create</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setShowGenModal(false)} className="px-4 py-2 font-medium hover:bg-surface-container rounded-lg">Cancel</button>
                <button type="submit" disabled={genLoading || !genParams.subject_id || !genParams.topic || !genParams.target_audience} className="px-4 py-2 bg-primary text-on-primary font-medium rounded-lg disabled:opacity-50 flex items-center gap-1">
                  {genLoading ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> : null}
                  Generate
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Review Modal */}
      {reviewDraft && (
        <DraftReviewDialog draft={reviewDraft} onClose={() => setReviewDraft(null)} onReviewed={handleReviewed} />
      )}
    </div>
  );
}
