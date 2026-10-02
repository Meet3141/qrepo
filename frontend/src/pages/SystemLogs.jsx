import React, { useCallback, useEffect, useState } from 'react';
import { analyticsApi } from '../api/platform';
import { notifyError } from '../api/errors';
import ActivityList from '../components/ActivityList';
import { LoadError, secondaryButton } from '../components/ui';

const LIMIT = 100; // backend maximum for /analytics/admin/activity

export default function SystemLogs() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [type, setType] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      setEvents(await analyticsApi.adminActivity(LIMIT));
    } catch (err) {
      setFailed(true);
      notifyError(err, 'Failed to load system activity.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const types = [...new Set(events.map((e) => e.type))].sort();
  const shown = type ? events.filter((e) => e.type === type) : events;

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-on-surface">System Logs</h1>
          <p className="text-[13px] text-on-surface-variant mt-1">
            The {LIMIT} most recent platform events: new users, document uploads and failures, AI generations and paper reviews.
          </p>
        </div>
        <div className="flex gap-2">
          <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by event type"
                  className="h-9 px-3 rounded-lg border border-outline-variant text-sm bg-surface-container-lowest outline-none focus:border-primary">
            <option value="">All events</option>
            {types.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
          <button onClick={load} disabled={loading} className={secondaryButton}>
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Refresh
          </button>
        </div>
      </div>

      {failed && <LoadError what="system activity" onRetry={load} />}

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col gap-3">
        {loading && events.length === 0 ? (
          <p className="text-[13px] text-secondary p-2">Loading activity...</p>
        ) : !failed && shown.length === 0 ? (
          <p className="text-[13px] text-on-surface-variant p-2">No activity recorded yet.</p>
        ) : (
          <ActivityList events={shown} />
        )}
      </div>
    </div>
  );
}
