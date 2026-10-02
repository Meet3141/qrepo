import React, { useState, useEffect } from 'react';
import { aiService } from '../api/ai';
import { subjectService } from '../api/subjects';
import { unitService } from '../api/units';
import { notifyError } from '../api/errors';
import { PERMISSIONS } from '../api/session';
import DraftReviewDialog, { DraftCard } from '../components/DraftReview';
import { useSession } from '../components/Session';
import { toast } from '../components/Toast';
import { Banner } from '../components/ui';

export default function PaperGenerator() {
  const { can } = useSession();
  const canGenerate = can(PERMISSIONS.AI_GENERATE_QUESTIONS) !== false;
  const [subjects, setSubjects] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    subjectService.getSubjects().then(setSubjects).catch((err) => notifyError(err, 'Failed to load subjects.'));
  }, []);

  const handleSubjectChange = (e) => {
    const subId = e.target.value;
    setSelectedSubject(subId);
    setSelectedUnit('');
    setUnits([]);
    if (subId) {
      unitService.getUnitsBySubject(subId)
        .then((list) => setUnits([...list].sort((a, b) => a.unit_number - b.unit_number)))
        .catch((err) => notifyError(err, 'Failed to load units.'));
    }
  };

  const handleGenerate = async () => {
    if (loading) return;
    if (!selectedSubject) return toast.error('Select a subject.');
    if (topic.trim().length < 2) return toast.error('Enter a topic of at least 2 characters.');
    if (targetAudience.trim().length < 2) return toast.error('Enter a target audience of at least 2 characters.');
    setLoading(true);
    try {
      const payload = {
        subject_id: selectedSubject,
        number_of_questions: Number(numQuestions),
        difficulty,
        question_type: questionType,
        bloom_level: bloomLevel,
        topic: topic.trim(),
        target_audience: targetAudience.trim(),
      };
      if (selectedUnit) {
        payload.unit_id = selectedUnit;
      }
      const generation = await aiService.generateQuestions(payload);
      setGenerationResult(generation);
      toast.success(`${generation.questions?.length || 0} question drafts generated. Review each one to add it to the question bank.`);
    } catch (err) {
      notifyError(err, 'Failed to generate questions.');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewed = (updated) => {
    setReviewingDraft(null);
    setGenerationResult((result) => ({
      ...result,
      questions: result.questions.map((q) => (q.id === updated.id ? updated : q)),
    }));
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
          {can(PERMISSIONS.AI_GENERATE_QUESTIONS) === false && (
            <div className="mb-4"><Banner kind="info">Your role is not allowed to generate questions. An administrator can change this in the permission matrix.</Banner></div>
          )}

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
              disabled={loading || !canGenerate || !selectedSubject || !topic || !targetAudience}
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
              {generationResult.questions?.map((q) => (
                <DraftCard key={q.id} draft={q} onReview={setReviewingDraft} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {reviewingDraft && (
        <DraftReviewDialog draft={reviewingDraft} onClose={() => setReviewingDraft(null)} onReviewed={handleReviewed} />
      )}
    </div>
  );
}
