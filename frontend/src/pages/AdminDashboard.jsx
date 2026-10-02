import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { analyticsApi } from '../api/platform';
import { notifyError } from '../api/errors';
import ActivityList from '../components/ActivityList';
import { LoadError, formatBytes } from '../components/ui';

function Kpi({ label, icon, iconClass, value, children }) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow min-w-0">
      <div className="flex justify-between items-start gap-2">
        <span className="text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold truncate">{label}</span>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iconClass}`}>
          <span className="material-symbols-outlined text-[16px]">{icon}</span>
        </div>
      </div>
      <div className="text-2xl font-semibold text-on-surface mt-1">{value}</div>
      {children}
    </div>
  );
}

function AiChart({ trend }) {
  const max = Math.max(1, ...trend.map((d) => d.success + d.failed));
  const any = trend.some((d) => d.success + d.failed > 0);
  if (!any) {
    return (
      <div className="flex-1 bg-surface-container rounded-lg border border-outline-variant/50 flex flex-col items-center justify-center gap-3 p-6">
        <span className="material-symbols-outlined text-[48px] text-outline">monitoring</span>
        <p className="text-[13px] text-on-surface-variant text-center">No AI generations in the last 14 days.</p>
      </div>
    );
  }
  return (
    <div className="flex-1 flex flex-col justify-center">
      <div className="flex items-end gap-1.5 min-h-[220px]">
        {trend.map((d) => {
          const total = d.success + d.failed;
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1"
                 title={`${d.date}: ${d.success} succeeded, ${d.failed} failed${d.avg_latency_ms ? `, avg ${(d.avg_latency_ms / 1000).toFixed(1)}s` : ''}`}>
              <div className="w-full flex flex-col justify-end h-[200px]">
                <div className="w-full bg-error/70 rounded-t" style={{ height: `${(100 * d.failed) / max}%` }} />
                <div className={`w-full bg-primary ${d.failed ? '' : 'rounded-t'}`} style={{ height: `${(100 * d.success) / max}%` }} />
              </div>
              <span className="text-[9px] text-outline">{total || ''}</span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-outline mt-1">
        <span>{trend[0].date}</span><span>{trend[trend.length - 1].date}</span>
      </div>
      <div className="flex gap-4 text-xs text-secondary mt-3">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-primary" />Succeeded</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-error/70" />Failed / rejected</span>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [activity, setActivity] = useState([]);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const [o, a] = await Promise.all([analyticsApi.adminOverview(), analyticsApi.adminActivity(6)]);
      setOverview(o);
      setActivity(a);
    } catch (err) {
      setFailed(true);
      notifyError(err, 'Failed to load dashboard data.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const o = overview;
  const quota = o?.documents.storage_quota_bytes;
  const usedPct = o?.documents.storage_used_ratio != null ? Math.round(o.documents.storage_used_ratio * 100) : null;

  return (
    <div className="w-full flex flex-col gap-6">
      {failed && <LoadError what="the dashboard" onRetry={load} />}

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <Kpi label="Total Users" icon="group" iconClass="bg-primary/10 text-primary" value={o ? o.users.total.toLocaleString() : '—'}>
          {o && (
            <div className="flex items-center gap-1 text-primary text-[11px] font-medium">
              <span className="material-symbols-outlined text-[14px]">trending_up</span>
              <span>+{o.users.new_last_7_days} this week · {o.users.active} active</span>
            </div>
          )}
        </Kpi>
        <Kpi label="Departments" icon="domain" iconClass="bg-secondary/10 text-secondary" value={o ? o.departments : '—'}>
          <div className="text-[12px] text-on-surface-variant truncate">Academic departments</div>
        </Kpi>
        <Kpi label="Subjects" icon="book" iconClass="bg-secondary/10 text-secondary" value={o ? o.subjects : '—'}>
          <div className="text-[12px] text-on-surface-variant truncate">{o ? `${o.units} units` : ''}</div>
        </Kpi>
        <Kpi label="AI Generations (24h)" icon="psychology" iconClass="bg-tertiary/10 text-tertiary" value={o ? o.ai.generations_last_24h : '—'}>
          {o && (
            <div className="text-[11px] text-on-surface-variant truncate">
              {o.ai.failed_last_24h ? `${o.ai.failed_last_24h} failed · ` : ''}
              {o.ai.avg_latency_ms_last_7_days ? `avg ${(o.ai.avg_latency_ms_last_7_days / 1000).toFixed(1)}s (7d)` : 'no runs this week'}
            </div>
          )}
        </Kpi>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col justify-between hover:shadow-sm transition-shadow sm:col-span-2 lg:col-span-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <span className="text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold truncate">Document Storage</span>
            <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-on-surface-variant shrink-0">
              <span className="material-symbols-outlined text-[16px]">cloud</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex justify-between items-end mb-2 gap-2">
              <span className="text-lg font-semibold text-on-surface shrink-0">{o ? formatBytes(o.documents.storage_bytes) : '—'}</span>
              <span className="text-[11px] text-on-surface-variant truncate">
                {o ? (quota ? `${usedPct}% of ${formatBytes(quota)}` : `${o.documents.total} documents`) : ''}
              </span>
            </div>
            {quota && (
              <div className="w-full bg-surface-variant rounded-full h-1.5 overflow-hidden">
                <div className={`h-1.5 rounded-full ${usedPct >= 90 ? 'bg-error' : 'bg-primary'}`} style={{ width: `${Math.min(100, usedPct)}%` }} />
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-4 min-h-[350px] flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[15px] font-semibold text-on-surface">AI Generation Activity (14 days)</h2>
            {o?.ai.success_rate_last_7_days != null && (
              <span className="text-[12px] text-secondary">{Math.round(o.ai.success_rate_last_7_days * 100)}% success (7d) · {o.ai.questions_generated_total} questions total</span>
            )}
          </div>
          {o ? <AiChart trend={o.ai.trend} /> : !failed && <p className="text-sm text-secondary">Loading...</p>}
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 min-h-[350px] flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[15px] font-semibold text-on-surface">Recent Activity</h2>
            <Link to="/admin/logs" className="text-primary text-[12px] font-medium hover:underline">View All</Link>
          </div>
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto max-h-[520px]">
            {overview && activity.length === 0 && <p className="text-[13px] text-on-surface-variant">No activity yet.</p>}
            <ActivityList events={activity} />
          </div>
        </div>
      </div>
    </div>
  );
}
