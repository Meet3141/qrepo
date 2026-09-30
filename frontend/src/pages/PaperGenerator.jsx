import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export default function PaperGenerator() {
  const [subjects, setSubjects] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form State
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [numSets, setNumSets] = useState(1);
  const [numQuestions, setNumQuestions] = useState(5);
  const [marks, setMarks] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');
  const [questionType, setQuestionType] = useState('descriptive');
  const [bloomLevel, setBloomLevel] = useState('apply');

  // Generated Paper State
  const [generatedPaper, setGeneratedPaper] = useState(null); // stores sets and status
  const [editingQuestion, setEditingQuestion] = useState(null); // id of question being edited
  const [editFormData, setEditFormData] = useState({});

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const res = await apiClient.get('/subjects/');
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
      const sub = subjects.find((s) => s.id === subId);
      setUnits(sub?.units || []);
    } else {
      setUnits([]);
    }
  };

  const handleGenerate = async () => {
    if (!selectedSubject) {
      setError('Subject is required');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        subject_id: selectedSubject,
        number_of_sets: Number(numSets),
        number_of_questions: Number(numQuestions),
        marks: Number(marks),
        difficulty,
        question_type: questionType,
        bloom_level: bloomLevel,
      };
      if (selectedUnit) {
        payload.unit_id = selectedUnit;
      }
      const res = await apiClient.post('/rag/generate', payload);
      setGeneratedPaper(res.data.data);
      setSuccess('Paper generated successfully!');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to generate paper. ' + (err.response?.data?.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (q) => {
    setEditingQuestion(q.id);
    setEditFormData({
      question_text: q.question,
      marks: q.marks,
      difficulty: q.difficulty,
      question_type: q.type,
      bloom_level: q.bloom_level
    });
  };

  const handleSaveEdit = async (qId, setId) => {
    try {
      await apiClient.patch(`/rag/questions/${qId}`, editFormData);
      // Update local state
      const newSets = generatedPaper.sets.map(s => {
        if (s.set_id === setId) {
          return {
            ...s,
            questions: s.questions.map(q => {
              if (q.id === qId) {
                return {
                  ...q,
                  question: editFormData.question_text,
                  marks: editFormData.marks,
                  difficulty: editFormData.difficulty,
                  type: editFormData.question_type,
                  bloom_level: editFormData.bloom_level
                };
              }
              return q;
            })
          };
        }
        return s;
      });
      setGeneratedPaper({ ...generatedPaper, sets: newSets });
      setEditingQuestion(null);
      setSuccess('Question updated');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to update question');
    }
  };

  const handleUpdateStatus = async (status) => {
    try {
      await apiClient.patch(`/rag/papers/${generatedPaper.paper_id}/status?status=${status}`);
      setGeneratedPaper({ ...generatedPaper, status });
      setSuccess(`Paper status updated to ${status}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to update status');
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface">
      {/* Page Header */}
      <div className="px-lg py-md border-b border-outline-variant bg-surface-container-lowest flex flex-col md:flex-row md:justify-between md:items-center shrink-0 gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-on-surface">Question Paper Generator</h2>
          <p className="text-sm text-secondary mt-1">Configure parameters and generate multiple sets using RAG.</p>
        </div>
        {generatedPaper && (
          <div className="flex gap-sm items-center">
            <span className="text-sm font-bold text-secondary mr-2">Status: {generatedPaper.status}</span>
            <button 
              onClick={() => handleUpdateStatus('REVIEWED')} 
              className="px-4 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-secondary text-sm font-semibold hover:bg-surface-container-low transition-colors"
            >
              Mark Reviewed
            </button>
            <button 
              onClick={() => handleUpdateStatus('APPROVED')} 
              className="px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Approve
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Pane: Config Builder */}
        <div className="w-full lg:w-[40%] flex flex-col overflow-y-auto p-lg border-r border-outline-variant">
          {error && <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-lg text-sm">{error}</div>}
          {success && <div className="mb-4 p-3 bg-primary-container text-on-primary-container rounded-lg text-sm">{success}</div>}
          
          <div className="space-y-6">
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-on-surface">Academic Scope</h3>
              <div>
                <label className="text-xs font-semibold text-secondary">Subject *</label>
                <select value={selectedSubject} onChange={handleSubjectChange} className="w-full h-10 px-3 border border-outline-variant rounded-md bg-surface-container-low text-on-surface text-sm">
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_code} - {s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary">Unit (Optional)</label>
                <select value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)} disabled={!selectedSubject} className="w-full h-10 px-3 border border-outline-variant rounded-md bg-surface-container-low text-on-surface text-sm">
                  <option value="">All Units</option>
                  {units.map(u => <option key={u.id} value={u.id}>Unit {u.unit_number}: {u.title}</option>)}
                </select>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-on-surface">Generation Constraints</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-secondary">Number of Sets</label>
                  <input type="number" min="1" max="5" value={numSets} onChange={e => setNumSets(e.target.value)} className="w-full h-10 px-3 border border-outline-variant rounded-md bg-surface-container-low text-on-surface text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-secondary">Questions per Set</label>
                  <input type="number" min="1" max="20" value={numQuestions} onChange={e => setNumQuestions(e.target.value)} className="w-full h-10 px-3 border border-outline-variant rounded-md bg-surface-container-low text-on-surface text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-secondary">Marks per Question</label>
                  <input type="number" min="1" value={marks} onChange={e => setMarks(e.target.value)} className="w-full h-10 px-3 border border-outline-variant rounded-md bg-surface-container-low text-on-surface text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-secondary">Difficulty</label>
                  <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="w-full h-10 px-3 border border-outline-variant rounded-md bg-surface-container-low text-on-surface text-sm">
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-secondary">Question Type</label>
                  <select value={questionType} onChange={e => setQuestionType(e.target.value)} className="w-full h-10 px-3 border border-outline-variant rounded-md bg-surface-container-low text-on-surface text-sm">
                    <option value="mcq">MCQ</option>
                    <option value="short_answer">Short Answer</option>
                    <option value="descriptive">Descriptive</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-secondary">Bloom's Level</label>
                  <select value={bloomLevel} onChange={e => setBloomLevel(e.target.value)} className="w-full h-10 px-3 border border-outline-variant rounded-md bg-surface-container-low text-on-surface text-sm">
                    <option value="remember">Remember</option>
                    <option value="understand">Understand</option>
                    <option value="apply">Apply</option>
                    <option value="analyze">Analyze</option>
                    <option value="evaluate">Evaluate</option>
                    <option value="create">Create</option>
                  </select>
                </div>
              </div>
            </div>

            <button 
              onClick={handleGenerate} 
              disabled={loading || !selectedSubject}
              className="w-full px-6 py-3 rounded-lg bg-primary text-on-primary font-bold flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? <span className="material-symbols-outlined animate-spin">refresh</span> : <span className="material-symbols-outlined">magic_button</span>}
              {loading ? 'Generating...' : 'Generate Paper Sets'}
            </button>
          </div>
        </div>

        {/* Right Pane: Generated Sets Review */}
        <div className="w-full lg:w-[60%] bg-surface-container p-lg flex flex-col h-full overflow-hidden">
          {!generatedPaper ? (
            <div className="flex-1 flex flex-col items-center justify-center text-secondary opacity-50">
              <span className="material-symbols-outlined text-[64px] mb-4">description</span>
              <p>Generated sets will appear here.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-8 pr-2">
              {generatedPaper.sets.map((set, sIdx) => (
                <div key={set.set_id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
                  <h3 className="text-xl font-bold text-on-surface border-b border-outline-variant pb-2 mb-4">{set.set_name}</h3>
                  <div className="space-y-6">
                    {set.questions.map((q, qIdx) => (
                      <div key={q.id} className="p-4 bg-surface-container-low rounded-lg border border-outline-variant">
                        {editingQuestion === q.id ? (
                          <div className="space-y-3">
                            <textarea 
                              value={editFormData.question_text} 
                              onChange={e => setEditFormData({...editFormData, question_text: e.target.value})}
                              className="w-full p-2 border border-outline-variant rounded bg-surface-container-lowest text-sm"
                              rows={3}
                            />
                            <div className="flex gap-2 text-xs">
                              <input type="number" value={editFormData.marks} onChange={e => setEditFormData({...editFormData, marks: Number(e.target.value)})} className="w-16 p-1 border rounded" />
                              <select value={editFormData.difficulty} onChange={e => setEditFormData({...editFormData, difficulty: e.target.value})} className="p-1 border rounded">
                                <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                              </select>
                              <select value={editFormData.question_type} onChange={e => setEditFormData({...editFormData, question_type: e.target.value})} className="p-1 border rounded">
                                <option value="mcq">MCQ</option><option value="short_answer">Short</option><option value="descriptive">Descriptive</option>
                              </select>
                              <select value={editFormData.bloom_level} onChange={e => setEditFormData({...editFormData, bloom_level: e.target.value})} className="p-1 border rounded">
                                <option value="remember">Remember</option><option value="understand">Understand</option><option value="apply">Apply</option>
                                <option value="analyze">Analyze</option><option value="evaluate">Evaluate</option><option value="create">Create</option>
                              </select>
                            </div>
                            <div className="flex justify-end gap-2 mt-2">
                              <button onClick={() => setEditingQuestion(null)} className="px-3 py-1 text-xs rounded border border-outline-variant">Cancel</button>
                              <button onClick={() => handleSaveEdit(q.id, set.set_id)} className="px-3 py-1 text-xs rounded bg-primary text-on-primary">Save</button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1 font-serif text-[15px] leading-relaxed text-on-surface">
                                <span className="font-bold mr-2">Q{qIdx + 1}.</span> {q.question}
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <span className="text-sm font-bold">[{q.marks} Marks]</span>
                                <button onClick={() => handleEditClick(q)} className="text-secondary hover:text-primary" title="Edit Question">
                                  <span className="material-symbols-outlined text-[18px]">edit</span>
                                </button>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-mono text-secondary">
                              <span className="bg-surface-variant px-2 py-1 rounded">Diff: {q.difficulty}</span>
                              <span className="bg-surface-variant px-2 py-1 rounded">Type: {q.type}</span>
                              <span className="bg-surface-variant px-2 py-1 rounded">Bloom: {q.bloom_level}</span>
                              {q.source_chunk_ids && q.source_chunk_ids.length > 0 && (
                                <span className="bg-primary-container text-on-primary-container px-2 py-1 rounded flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[12px]">link</span>
                                  Grounded ({q.source_chunk_ids.length} sources)
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
