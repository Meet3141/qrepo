import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { aiService } from '../api/ai';
import Modal from '../components/Modal';

export default function PaperGenerator() {
  const [subjects, setSubjects] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form State — matches backend QuestionGenerationRequest
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState('MEDIUM');
  const [questionType, setQuestionType] = useState('MCQ');
  const [bloomLevel, setBloomLevel] = useState('APPLY');
  const [topic, setTopic] = useState('');
  const [targetAudience, setTargetAudience] = useState('');

  // Generated Result State
  const [generationResult, setGenerationResult] = useState(null);

  // Review state
  const [reviewingDraft, setReviewingDraft] = useState(null);
  const [reviewAction, setReviewAction] = useState('ACCEPT');
  const [reviewComment, setReviewComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const res = await apiClient.get('/subjects');
      setSubjects(res.data.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch subjects');
    }
  };

  const handleSubjectChange = (e) => {
    const subId = e.target.value;
    setSelectedSubject(subId);
    setSelectedUnit('');
    if (subId) {
      // Fetch units for the selected subject
      apiClient.get(`/subjects/${subId}/units`)
        .then(res => setUnits(res.data.data || []))
        .catch(() => setUnits([]));
    } else {
      setUnits([]);
    }
  };

  const handleGenerate = async () => {
    if (!selectedSubject) {
      setError('Subject is required');
      return;
    }
    if (!topic || topic.length < 2) {
      setError('Topic is required (at least 2 characters)');
      return;
    }
    if (!targetAudience || targetAudience.length < 2) {
      setError('Target audience is required (at least 2 characters)');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        subject_id: selectedSubject,
        number_of_questions: Number(numQuestions),
        difficulty,
        question_type: questionType,
        bloom_level: bloomLevel,
        topic,
        target_audience: targetAudience,
      };
      if (selectedUnit) {
        payload.unit_id = selectedUnit;
      }
      const res = await aiService.generateQuestions(payload);
      setGenerationResult(res.data);
      setSuccess('Questions generated successfully!');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to generate questions.');
    } finally {
      setLoading(false);
    }
  };

  const openReview = (draft) => {
    setReviewingDraft(draft);
    setReviewAction('ACCEPT');
    setReviewComment('');
    setRejectionReason('');
  };

  const handleReviewSubmit = async () => {
    if (!reviewingDraft) return;
    setReviewLoading(true);
    const payload = { action: reviewAction };
    if (reviewComment) payload.comment = reviewComment;
    if (reviewAction === 'REJECT' && rejectionReason) {
      payload.rejection_reason = rejectionReason;
    }
    try {
      const res = await aiService.reviewDraft(reviewingDraft.id, payload);
      // Update the draft in local state
      if (generationResult && generationResult.questions) {
        const updatedQuestions = generationResult.questions.map(q =>
          q.id === reviewingDraft.id ? res.data : q
        );
        setGenerationResult({ ...generationResult, questions: updatedQuestions });
      }
      setReviewingDraft(null);
      setSuccess('Review saved!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Review failed');
    } finally {
      setReviewLoading(false);
    }
  };

  const statusColor = (status) => {
    if (status === 'VALIDATED') return 'bg-primary-container text-on-primary-container';
    if (status === 'EDITED') return 'bg-secondary-container text-on-secondary-container';
    if (status === 'REJECTED') return 'bg-error-container text-on-error-container';
    return 'bg-surface-variant text-on-surface-variant';
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface">
      {/* Page Header */}
      <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-lowest flex flex-col md:flex-row md:justify-between md:items-center shrink-0 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-on-surface">Question Generator</h2>
          <p className="text-sm text-secondary mt-1">Configure parameters and generate AI-powered question drafts for review.</p>
        </div>
        {generationResult && (
          <div className="flex gap-2 items-center">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${generationResult.status === 'SUCCESS' ? 'bg-primary-container text-on-primary-container' : 'bg-error-container text-on-error-container'}`}>
              {generationResult.status}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Pane: Config Builder */}
        <div className="w-full lg:w-[40%] flex flex-col overflow-y-auto p-6 border-r border-outline-variant">
          {error && <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-lg text-sm">{error}</div>}
          {success && <div className="mb-4 p-3 bg-primary-container text-on-primary-container rounded-lg text-sm">{success}</div>}

          <div className="space-y-6">
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-on-surface">Academic Scope</h3>
              <div>
                <label className="text-xs font-semibold text-secondary">Subject *</label>
                <select value={selectedSubject} onChange={handleSubjectChange} className="w-full h-10 px-3 border border-outline-variant rounded-md bg-surface-container-low text-on-surface text-sm">
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary">Unit (Optional)</label>
                <select value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)} disabled={!selectedSubject} className="w-full h-10 px-3 border border-outline-variant rounded-md bg-surface-container-low text-on-surface text-sm">
                  <option value="">All Units</option>
                  {units.map(u => <option key={u.id} value={u.id}>Unit {u.unit_number}: {u.title}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary">Topic *</label>
                <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Sorting Algorithms" maxLength={200} className="w-full h-10 px-3 border border-outline-variant rounded-md bg-surface-container-low text-on-surface text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary">Target Audience *</label>
                <input type="text" value={targetAudience} onChange={e => setTargetAudience(e.target.value)} placeholder="e.g. 3rd year B.Tech CS students" maxLength={100} className="w-full h-10 px-3 border border-outline-variant rounded-md bg-surface-container-low text-on-surface text-sm" />
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-on-surface">Generation Constraints</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-secondary">Questions per Batch</label>
                  <select value={numQuestions} onChange={e => setNumQuestions(e.target.value)} className="w-full h-10 px-3 border border-outline-variant rounded-md bg-surface-container-low text-on-surface text-sm">
                    <option value="5">5</option>
                    <option value="6">6</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-secondary">Difficulty</label>
                  <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="w-full h-10 px-3 border border-outline-variant rounded-md bg-surface-container-low text-on-surface text-sm">
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-secondary">Question Type</label>
                  <select value={questionType} onChange={e => setQuestionType(e.target.value)} className="w-full h-10 px-3 border border-outline-variant rounded-md bg-surface-container-low text-on-surface text-sm">
                    <option value="MCQ">MCQ</option>
                    <option value="SHORT_ANSWER">Short Answer</option>
                    <option value="LONG_ANSWER">Long Answer</option>
                    <option value="TRUE_FALSE">True / False</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-secondary">Bloom's Level</label>
                  <select value={bloomLevel} onChange={e => setBloomLevel(e.target.value)} className="w-full h-10 px-3 border border-outline-variant rounded-md bg-surface-container-low text-on-surface text-sm">
                    <option value="REMEMBER">Remember</option>
                    <option value="UNDERSTAND">Understand</option>
                    <option value="APPLY">Apply</option>
                    <option value="ANALYZE">Analyze</option>
                    <option value="EVALUATE">Evaluate</option>
                    <option value="CREATE">Create</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || !selectedSubject || !topic || !targetAudience}
              className="w-full px-6 py-3 rounded-lg bg-primary text-on-primary font-bold flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? <span className="material-symbols-outlined animate-spin">refresh</span> : <span className="material-symbols-outlined">auto_awesome</span>}
              {loading ? 'Generating...' : 'Generate Questions'}
            </button>
          </div>
        </div>

        {/* Right Pane: Generated Questions Review */}
        <div className="w-full lg:w-[60%] bg-surface-container p-6 flex flex-col h-full overflow-hidden">
          {!generationResult ? (
            <div className="flex-1 flex flex-col items-center justify-center text-secondary opacity-50">
              <span className="material-symbols-outlined text-[64px] mb-4">description</span>
              <p>Generated questions will appear here.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {/* Generation Metadata */}
              {generationResult.metadata && (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4">
                  <h3 className="text-sm font-bold text-on-surface mb-2">Generation Details</h3>
                  <div className="flex flex-wrap gap-3 text-xs text-secondary">
                    <span>Model: {generationResult.model}</span>
                    <span>Prompt: {generationResult.prompt_version}</span>
                    <span>Latency: {generationResult.metadata.latency_ms}ms</span>
                    <span>Requested: {generationResult.metadata.questions_requested}</span>
                    <span>Returned: {generationResult.metadata.questions_returned}</span>
                    <span>Attempts: {generationResult.metadata.generation_attempts}</span>
                    {generationResult.metadata.repair_attempted && <span className="text-tertiary font-semibold">Repair attempted</span>}
                  </div>
                </div>
              )}

              {/* Question Drafts */}
              {generationResult.questions?.map((q, qIdx) => (
                <div key={q.id} className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant">
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <div className="flex-1 text-[15px] leading-relaxed text-on-surface">
                      <span className="font-bold mr-2">Q{q.position}.</span> {q.question_text}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-sm font-bold">[{q.marks} Marks]</span>
                      {q.faculty_review_status === 'DRAFT' && (
                        <button onClick={() => openReview(q)} className="text-primary hover:underline text-xs font-semibold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">rate_review</span>
                          Review
                        </button>
                      )}
                    </div>
                  </div>

                  {/* MCQ Options */}
                  {q.options && q.options.length > 0 && (
                    <div className="mb-3 flex flex-col gap-1">
                      {q.options.map((opt, oi) => (
                        <div key={oi} className={`text-sm px-3 py-1.5 rounded ${oi === q.correct_option_index ? 'bg-primary-container text-on-primary-container font-medium' : 'bg-surface-container text-on-surface-variant'}`}>
                          {String.fromCharCode(65 + oi)}. {opt} {oi === q.correct_option_index && '✓'}
                        </div>
                      ))}
                    </div>
                  )}

                  {q.expected_answer && (
                    <div className="mb-3 text-xs text-secondary bg-surface-container rounded-lg p-3">
                      <span className="font-semibold">Expected Answer: </span>{q.expected_answer}
                    </div>
                  )}

                  {q.explanation && (
                    <div className="mb-3 text-xs text-secondary bg-surface-container rounded-lg p-3">
                      <span className="font-semibold">Explanation: </span>{q.explanation}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 text-[10px] font-mono text-secondary">
                    <span className="bg-surface-variant px-2 py-1 rounded">{q.difficulty}</span>
                    <span className="bg-surface-variant px-2 py-1 rounded">{q.question_type}</span>
                    <span className="bg-surface-variant px-2 py-1 rounded">Bloom: {q.bloom_level}</span>
                    <span className={`px-2 py-1 rounded font-bold ${statusColor(q.faculty_review_status)}`}>
                      {q.faculty_review_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {reviewingDraft && (
        <Modal onClose={() => setReviewingDraft(null)}>
          <div className="bg-surface-container-lowest rounded-xl shadow-lg p-6 min-w-[90vw] md:min-w-[28rem] max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-on-surface mb-3">Review Question Draft</h3>
            <p className="text-sm text-on-surface mb-4 line-clamp-3">{reviewingDraft.question_text}</p>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-secondary">Action</label>
                <select value={reviewAction} onChange={e => setReviewAction(e.target.value)} className="w-full h-[40px] bg-surface-container border border-outline-variant rounded-lg px-3 outline-none text-sm">
                  <option value="ACCEPT">Accept (Validate)</option>
                  <option value="REJECT">Reject</option>
                </select>
              </div>

              {reviewAction === 'REJECT' && (
                <div>
                  <label className="text-xs font-semibold text-secondary">Rejection Reason *</label>
                  <select required value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} className="w-full h-[40px] bg-surface-container border border-outline-variant rounded-lg px-3 outline-none text-sm">
                    <option value="">Select reason</option>
                    <option value="INCORRECT">Incorrect</option>
                    <option value="AMBIGUOUS">Ambiguous</option>
                    <option value="OFF_TOPIC">Off Topic</option>
                    <option value="WRONG_DIFFICULTY">Wrong Difficulty</option>
                    <option value="WRONG_BLOOM_LEVEL">Wrong Bloom Level</option>
                    <option value="DUPLICATE">Duplicate</option>
                    <option value="POOR_LANGUAGE">Poor Language</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-secondary">Comment (Optional)</label>
                <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} maxLength={1000} rows={2} className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 outline-none text-sm resize-none" placeholder="Optional feedback..." />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setReviewingDraft(null)} className="px-4 py-2 text-sm border border-outline-variant rounded-lg">Cancel</button>
              <button onClick={handleReviewSubmit} disabled={reviewLoading || (reviewAction === 'REJECT' && !rejectionReason)} className="px-4 py-2 text-sm bg-primary text-on-primary rounded-lg font-medium disabled:opacity-50">
                {reviewLoading ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
