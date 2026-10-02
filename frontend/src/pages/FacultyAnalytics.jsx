import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsApi, papersApi } from '../api/platform';
import { notifyError } from '../api/errors';
import { BLOOM_LEVELS } from '../components/paperConstants';
import { LoadError, enumLabel } from '../components/ui';

const BLOOM_COLORS = ['#b4c5ff', '#7c9cff', '#2563eb', '#003ea8', '#6d28d9', '#a21caf'];
const pct = (v) => (v == null ? '—' : `${Math.round(v * 100)}%`);

function Kpi({ label, icon, value, sub, tone }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-md border border-outline-variant shadow-sm flex flex-col">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-xs text-secondary uppercase tracking-wider font-semibold">{label}</h3>
        <div className={`p-2 rounded-lg ${tone === 'warn' ? 'bg-error-container text-on-error-container' : 'bg-surface-container-low text-primary'}`}>
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
      </div>
      <span className="text-3xl font-bold text-on-surface">{value}</span>
      {sub && <p className="text-xs text-secondary mt-2">{sub}</p>}
    </div>
  );
}

function Donut({ counts }) {
  const total = BLOOM_LEVELS.reduce((a, k) => a + (counts[k] || 0), 0);
  let angle = 0;
  const stops = BLOOM_LEVELS.map((k, i) => {
    const start = angle;
    angle += total ? (360 * (counts[k] || 0)) / total : 0;
    return `${BLOOM_COLORS[i]} ${start}deg ${angle}deg`;
  });
  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="relative w-32 h-32 rounded-full flex items-center justify-center"
           style={{ background: total ? `conic-gradient(${stops.join(', ')})` : 'var(--color-surface-variant, #e7e7f3)' }}>
        <div className="w-20 h-20 rounded-full bg-surface-container-lowest flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-on-surface">{total}</span>
          <span className="text-[10px] text-secondary">questions</span>
        </div>
      </div>
      <div className="w-full space-y-1.5">
        {BLOOM_LEVELS.map((k, i) => (
          <div key={k} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm" style={{ background: BLOOM_COLORS[i] }} /><span className="text-xs text-secondary">{enumLabel(k)}</span></div>
            <span className="font-semibold text-xs">{total ? Math.round((100 * (counts[k] || 0)) / total) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendChart({ trend }) {
  const max = Math.max(1, ...trend.map((w) => w.generated));
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 flex items-end gap-3 min-h-[180px]">
        {trend.map((w) => (
          <div key={w.week_start} className="flex-1 flex flex-col items-center gap-1" title={`Week of ${w.week_start}: ${w.generated} generated, ${w.accepted} accepted`}>
            <div className="w-full flex items-end gap-0.5 h-[160px]">
              <div className="flex-1 bg-primary/30 rounded-t" style={{ height: `${(100 * w.generated) / max}%` }} />
              <div className="flex-1 bg-primary rounded-t" style={{ height: `${(100 * w.accepted) / max}%` }} />
            </div>
            <span className="text-[10px] text-secondary">{new Date(`${w.week_start}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 text-xs text-secondary mt-3">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-primary/30" />Generated</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-primary" />Accepted</span>
      </div>
    </div>
  );
}

export default function FacultyAnalytics() {
  const navigate = useNavigate();
  const [subjectId, setSubjectId] = useState('');
  const [data, setData] = useState(null);
  const [subjects, setSubjects] = useState([]); // full list, kept while a single subject is selected
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [building, setBuilding] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    setLoading(true);
    try {
      const overview = await analyticsApi.facultyOverview(subjectId || undefined);
      setData(overview);
      if (!subjectId) setSubjects(overview.scope.subjects);
    } catch (err) {
      setFailed(true);
      notifyError(err, 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  useEffect(() => { load(); }, [load]);

  const generateBalanced = async (action) => {
    setBuilding(true);
    try {
      const subject = subjects.find((s) => s.id === action.subject_id);
      const paper = await papersApi.create({
        title: `Balanced draft — ${subject?.code || 'paper'} (${new Date().toLocaleDateString()})`,
        subject_id: action.subject_id,
        exam_type: 'Draft',
        blueprint: action.blueprint,
      });
      navigate(`/dashboard/papers?paper=${paper.id}`);
    } catch (err) {
      notifyError(err, 'Could not build a balanced draft.');
    } finally {
      setBuilding(false);
    }
  };

  const exportHeatmap = async () => {
    try { await analyticsApi.exportHeatmap(subjectId || undefined); } catch (err) { notifyError(err, 'Export failed.'); }
  };

  const k = data?.kpis;
  const heat = data?.topic_heatmap;
  const heatMax = Math.max(1, ...(heat?.rows || []).flatMap((r) => Object.values(r.counts)));

  return (
    <div className="flex-1 p-margin-mobile md:p-gutter max-w-container-max mx-auto space-y-6 h-full overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Faculty Analytics Overview</h1>
          <p className="text-sm text-secondary mt-1">Question bank coverage, AI generation outcomes and papers for your subjects.</p>
        </div>
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}
                className="bg-surface-container-lowest border border-outline-variant text-secondary text-sm rounded-lg p-2 outline-none focus:border-primary">
          <option value="">All my subjects</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
        </select>
      </div>

      {failed && <LoadError what="analytics" onRetry={load} />}

      {loading && !data ? (
        <p className="text-secondary text-sm">Loading analytics...</p>
      ) : data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi label="Questions Generated" icon="smart_toy" value={k.questions_generated}
                 sub={`${k.generations_total} AI generation${k.generations_total === 1 ? '' : 's'}${k.generations_failed ? `, ${k.generations_failed} failed` : ''}`} />
            <Kpi label="Acceptance Rate" icon="trending_up" value={pct(k.acceptance_rate)}
                 sub={`${k.questions_accepted} accepted · ${k.questions_rejected} rejected`} />
            <Kpi label="Awaiting Review" icon="pending_actions" value={k.questions_pending_review}
                 sub="AI drafts not yet reviewed" tone={k.questions_pending_review >= 20 ? 'warn' : undefined} />
            <Kpi label="Papers" icon="assignment" value={k.papers_total}
                 sub={`${k.papers_approved} approved · ${k.papers_pending_review} pending review`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm lg:col-span-2 flex flex-col overflow-hidden min-h-[300px]">
              <div className="p-4 border-b border-outline-variant bg-surface-bright">
                <h3 className="text-lg font-semibold text-on-surface">Question Generation Trend</h3>
                <p className="text-sm text-secondary">AI questions generated vs. accepted per week (last 8 weeks)</p>
              </div>
              <div className="p-4 flex-1"><TrendChart trend={data.trend} /></div>
            </div>
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm flex flex-col min-h-[300px]">
              <div className="p-4 border-b border-outline-variant bg-surface-bright">
                <h3 className="text-lg font-semibold text-on-surface">Bloom's Taxonomy</h3>
                <p className="text-sm text-secondary">Accepted question bank distribution</p>
              </div>
              <div className="p-4 flex-1 flex items-center"><Donut counts={data.bloom_distribution.question_bank} /></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm flex flex-col">
              <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-bright">
                <div>
                  <h3 className="text-lg font-semibold text-on-surface">Topic × Bloom Coverage</h3>
                  <p className="text-sm text-secondary">Accepted questions per topic and cognitive level; darker = more questions</p>
                </div>
                <button onClick={exportHeatmap} className="text-primary hover:bg-surface-container-low p-2 rounded-lg transition-colors flex items-center" title="Export CSV">
                  <span className="material-symbols-outlined text-[20px]">download</span>
                </button>
              </div>
              <div className="p-4 overflow-x-auto">
                {heat.rows.length === 0 ? (
                  <p className="text-sm text-secondary text-center py-6">No accepted questions yet.</p>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr>
                        <th className="p-2 text-xs text-secondary border-b border-outline-variant">Topic</th>
                        {heat.bloom_levels.map((l) => <th key={l} className="p-2 text-[10px] text-secondary border-b border-outline-variant text-center">{enumLabel(l)}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {heat.rows.map((row) => (
                        <tr key={row.topic}>
                          <td className="p-2 text-sm border-b border-outline-variant">{row.topic}</td>
                          {heat.bloom_levels.map((l) => {
                            const n = row.counts[l];
                            const alpha = n ? 0.15 + (0.8 * n) / heatMax : 0;
                            return (
                              <td key={l} className="p-1 border-b border-outline-variant">
                                <div className={`text-center py-2 rounded text-xs ${alpha > 0.5 ? 'text-white' : 'text-on-surface'}`}
                                     style={{ background: n ? `rgba(37, 99, 235, ${alpha})` : 'transparent' }}>{n || '·'}</div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl border border-primary-fixed shadow-sm flex flex-col relative overflow-hidden">
              <div className="p-4 border-b border-outline-variant flex gap-2 items-center bg-surface-bright/50">
                <span className="material-symbols-outlined text-primary">auto_awesome</span>
                <h3 className="text-lg font-semibold text-on-surface">Actionable Insights</h3>
              </div>
              <div className="p-4 flex-1 flex flex-col gap-4">
                {data.insights.length === 0 ? (
                  <p className="text-sm text-secondary">No issues detected. Your question bank looks balanced.</p>
                ) : data.insights.map((insight) => (
                  <div key={insight.title} className="bg-surface-container-low rounded-lg p-3 border border-outline-variant/50 flex gap-3 items-start">
                    <span className={`material-symbols-outlined mt-1 text-[18px] ${insight.severity === 'warning' ? 'text-error' : 'text-primary'}`}>
                      {insight.severity === 'warning' ? 'warning' : insight.severity === 'info' ? 'info' : 'lightbulb'}
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold text-on-surface">{insight.title}</h4>
                      <p className="text-xs text-secondary mt-1">{insight.message}</p>
                      {insight.action?.type === 'generate_balanced_paper' && (
                        <button onClick={() => generateBalanced(insight.action)} disabled={building}
                                className="mt-2 text-primary text-xs font-bold hover:underline disabled:opacity-50">
                          {building ? 'Building draft…' : 'Generate Balanced Draft →'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {Object.keys(data.rejection_reasons).length > 0 && (
                  <div className="text-xs text-secondary">
                    <span className="font-semibold">Top rejection reasons: </span>
                    {Object.entries(data.rejection_reasons).slice(0, 3).map(([r, n]) => `${enumLabel(r)} (${n})`).join(', ')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
