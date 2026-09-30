import React, { useState, useEffect } from 'react';
import { questionsApi } from '../api/questions';
import { subjectService } from '../api/subjects';

export default function QuestionBank() {
  const [questions, setQuestions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    subject_id: '',
    unit_id: '',
    difficulty: '',
    question_type: '',
    bloom_level: ''
  });

  // Generation Modal State
  const [showGenModal, setShowGenModal] = useState(false);
  const [genParams, setGenParams] = useState({
    subject_id: '',
    unit_id: '',
    number_of_questions: 5,
    marks: 5,
    difficulty: 'medium',
    question_type: 'descriptive',
    bloom_level: 'apply',
    topic: ''
  });
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState(null);

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [filters]);

  const fetchSubjects = async () => {
    try {
      const data = await subjectService.getSubjects();
      setSubjects(data.data || []);
    } catch (err) {
      console.error('Failed to load subjects', err);
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const data = await questionsApi.list(filters);
      setQuestions(data.data?.items || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load questions', err);
      setError('Failed to load questions. You might not have permission or the server is unreachable.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      subject_id: '',
      unit_id: '',
      difficulty: '',
      question_type: '',
      bloom_level: ''
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      await questionsApi.delete(id);
      fetchQuestions();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete question');
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenLoading(true);
    setGenError(null);
    
    // Convert unit_id to null if empty so Pydantic doesn't throw on empty string
    const payload = { ...genParams };
    if (!payload.unit_id) delete payload.unit_id;
    if (!payload.topic) delete payload.topic;
    payload.number_of_questions = parseInt(payload.number_of_questions, 10);
    payload.marks = parseInt(payload.marks, 10);

    try {
      await questionsApi.generate(payload);
      setShowGenModal(false);
      fetchQuestions(); // Refresh list
    } catch (err) {
      setGenError(err.response?.data?.message || 'Generation failed');
    } finally {
      setGenLoading(false);
    }
  };

  return (
    <div className="max-w-container-max mx-auto py-lg md:py-xl w-full flex flex-col gap-lg relative">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
        <div>
          <h2 className="font-display text-4xl font-bold text-on-surface">Question Bank</h2>
          <p className="text-secondary mt-xs">Manage and curate assessment items for generated papers.</p>
        </div>
        <div className="flex gap-sm">
          <button onClick={() => setShowGenModal(true)} className="bg-primary-container text-on-primary-container font-medium text-sm px-4 py-2 rounded-lg shadow-sm hover:opacity-90 transition-colors flex items-center gap-sm">
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            Generate via AI
          </button>
          <button onClick={() => alert('Manual creation coming soon!')} className="bg-primary text-on-primary font-medium text-sm px-4 py-2 rounded-lg shadow-sm hover:bg-primary/90 transition-colors flex items-center gap-sm">
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Question
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-md">
          <div className="flex flex-col gap-xs">
            <label className="text-xs font-semibold text-secondary">Subject</label>
            <select name="subject_id" value={filters.subject_id} onChange={handleFilterChange} className="h-[40px] bg-surface-container-low border border-transparent focus:border-primary rounded-lg text-sm px-sm outline-none">
              <option value="">All Subjects</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
            </select>
          </div>
          
          <div className="flex flex-col gap-xs">
            <label className="text-xs font-semibold text-secondary">Type</label>
            <select name="question_type" value={filters.question_type} onChange={handleFilterChange} className="h-[40px] bg-surface-container-low border border-transparent focus:border-primary rounded-lg text-sm px-sm outline-none">
              <option value="">All Types</option>
              <option value="mcq">MCQ</option>
              <option value="short_answer">Short Answer</option>
              <option value="descriptive">Descriptive</option>
            </select>
          </div>
          
          <div className="flex flex-col gap-xs">
            <label className="text-xs font-semibold text-secondary">Difficulty</label>
            <select name="difficulty" value={filters.difficulty} onChange={handleFilterChange} className="h-[40px] bg-surface-container-low border border-transparent focus:border-primary rounded-lg text-sm px-sm outline-none">
              <option value="">Any Level</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          
          <div className="flex flex-col gap-xs">
            <label className="text-xs font-semibold text-secondary">Bloom's Taxonomy</label>
            <select name="bloom_level" value={filters.bloom_level} onChange={handleFilterChange} className="h-[40px] bg-surface-container-low border border-transparent focus:border-primary rounded-lg text-sm px-sm outline-none">
              <option value="">All Levels</option>
              <option value="remember">Remember</option>
              <option value="understand">Understand</option>
              <option value="apply">Apply</option>
              <option value="analyze">Analyze</option>
              <option value="evaluate">Evaluate</option>
              <option value="create">Create</option>
            </select>
          </div>

          <div className="flex items-end">
            <button onClick={clearFilters} className="h-[40px] px-4 w-full text-sm font-medium text-primary hover:bg-surface-container rounded-lg transition-colors border border-outline-variant">
              Clear All
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-error-container text-on-error-container rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Question Grid */}
      {loading ? (
        <div className="flex justify-center p-xl">
          <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center p-xl bg-surface-container-lowest border border-outline-variant rounded-xl text-secondary">
          No questions found matching your criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
          {questions.map(q => (
            <div key={q.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex flex-col gap-md hover:shadow-md transition-shadow group relative overflow-hidden">
              {q.source_chunks && q.source_chunks.length > 0 && (
                <div className="absolute top-0 right-0 p-sm text-primary-container opacity-20">
                  <span className="material-symbols-outlined text-[48px]">auto_awesome</span>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-sm relative z-10">
                <span className={`px-2 py-1 rounded text-xs font-medium ${q.difficulty === 'hard' ? 'bg-error-container text-on-error-container' : q.difficulty === 'easy' ? 'bg-surface-variant text-on-surface-variant' : 'bg-secondary-container text-on-secondary-container'}`}>
                  {q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)}
                </span>
                <span className="px-2 py-1 rounded bg-surface-container text-on-surface-variant text-xs font-medium flex items-center gap-xs border border-outline-variant">
                  <span className="material-symbols-outlined text-[14px]">psychology</span> {q.bloom_level.charAt(0).toUpperCase() + q.bloom_level.slice(1)}
                </span>
                <span className="px-2 py-1 rounded bg-surface-container text-on-surface-variant text-xs font-medium flex items-center gap-xs border border-outline-variant">
                  {q.marks} Marks
                </span>
                {q.source_chunks && q.source_chunks.length > 0 && (
                  <span className="px-2 py-1 rounded bg-primary-fixed text-on-primary-fixed-variant text-xs font-medium flex items-center gap-xs">
                    <span className="material-symbols-outlined text-[14px]">smart_toy</span> AI
                  </span>
                )}
                <div className="ml-auto flex items-center gap-xs opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleDelete(q.id)} className="p-1 text-secondary hover:text-error hover:bg-error-container/30 rounded transition-colors" title="Delete">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
              <p className="text-sm text-on-surface line-clamp-4 flex-1 relative z-10">
                {q.question_text}
              </p>
              <div className="pt-sm border-t border-outline-variant flex flex-wrap gap-xs relative z-10">
                <span className="text-xs font-semibold text-secondary">#{q.question_type}</span>
                {q.source_chunks && q.source_chunks.length > 0 && (
                  <span className="text-xs font-semibold text-primary" title="Traceable to source document chunk">Source Traceable</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generation Modal */}
      {showGenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface-container-lowest rounded-xl shadow-lg p-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-md">
              <h3 className="text-xl font-bold flex items-center gap-sm">
                <span className="material-symbols-outlined text-primary">auto_awesome</span>
                Generate AI Questions
              </h3>
              <button onClick={() => setShowGenModal(false)} className="text-secondary hover:text-on-surface"><span className="material-symbols-outlined">close</span></button>
            </div>
            
            {genError && (
              <div className="mb-md p-3 bg-error-container text-on-error-container rounded text-sm">
                {genError}
              </div>
            )}
            
            <form onSubmit={handleGenerate} className="flex flex-col gap-md">
              <div className="flex flex-col gap-xs">
                <label className="text-sm font-semibold">Subject *</label>
                <select required value={genParams.subject_id} onChange={e => setGenParams({...genParams, subject_id: e.target.value})} className="h-[40px] bg-surface-container border border-outline-variant rounded-lg px-3 outline-none">
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-md">
                <div className="flex flex-col gap-xs">
                  <label className="text-sm font-semibold">Count</label>
                  <input type="number" min="1" max="20" required value={genParams.number_of_questions} onChange={e => setGenParams({...genParams, number_of_questions: e.target.value})} className="h-[40px] bg-surface-container border border-outline-variant rounded-lg px-3 outline-none" />
                </div>
                <div className="flex flex-col gap-xs">
                  <label className="text-sm font-semibold">Marks</label>
                  <input type="number" min="1" required value={genParams.marks} onChange={e => setGenParams({...genParams, marks: e.target.value})} className="h-[40px] bg-surface-container border border-outline-variant rounded-lg px-3 outline-none" />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-md">
                <div className="flex flex-col gap-xs">
                  <label className="text-sm font-semibold">Type</label>
                  <select value={genParams.question_type} onChange={e => setGenParams({...genParams, question_type: e.target.value})} className="h-[40px] bg-surface-container border border-outline-variant rounded-lg px-3 outline-none">
                    <option value="mcq">MCQ</option>
                    <option value="short_answer">Short</option>
                    <option value="descriptive">Descriptive</option>
                  </select>
                </div>
                <div className="flex flex-col gap-xs">
                  <label className="text-sm font-semibold">Difficulty</label>
                  <select value={genParams.difficulty} onChange={e => setGenParams({...genParams, difficulty: e.target.value})} className="h-[40px] bg-surface-container border border-outline-variant rounded-lg px-3 outline-none">
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div className="flex flex-col gap-xs">
                  <label className="text-sm font-semibold">Bloom's</label>
                  <select value={genParams.bloom_level} onChange={e => setGenParams({...genParams, bloom_level: e.target.value})} className="h-[40px] bg-surface-container border border-outline-variant rounded-lg px-3 outline-none">
                    <option value="remember">Remember</option>
                    <option value="understand">Understand</option>
                    <option value="apply">Apply</option>
                    <option value="analyze">Analyze</option>
                    <option value="evaluate">Evaluate</option>
                    <option value="create">Create</option>
                  </select>
                </div>
              </div>
              
              <div className="flex flex-col gap-xs">
                <label className="text-sm font-semibold">Topic (Optional context guide)</label>
                <input type="text" placeholder="e.g. Sorting Algorithms" value={genParams.topic} onChange={e => setGenParams({...genParams, topic: e.target.value})} className="h-[40px] bg-surface-container border border-outline-variant rounded-lg px-3 outline-none" />
              </div>
              
              <div className="flex justify-end gap-sm mt-md">
                <button type="button" onClick={() => setShowGenModal(false)} className="px-4 py-2 font-medium hover:bg-surface-container rounded-lg">Cancel</button>
                <button type="submit" disabled={genLoading || !genParams.subject_id} className="px-4 py-2 bg-primary text-on-primary font-medium rounded-lg disabled:opacity-50 flex items-center gap-xs">
                  {genLoading ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> : null}
                  Generate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
