import React, { useCallback, useEffect, useState } from 'react';
import { aiService } from '../api/ai';
import { getErrorMessage, notifyError } from '../api/errors';
import { ROLES } from '../api/session';
import { useSession } from '../components/Session';
import { enumLabel, secondaryButton } from '../components/ui';

/** Account details for everyone; AI provider status (GET /ai/health) for Admins. */
export default function Settings() {
  const { user, role } = useSession();
  const isAdmin = role === ROLES.ADMIN;

  return (
    <div className="w-full flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-on-surface">{isAdmin ? 'AI Configuration & Settings' : 'Settings'}</h1>
        <p className="text-[13px] text-on-surface-variant mt-1">
          {isAdmin ? 'Your account and the status of the AI question-generation service.' : 'Your account details.'}
        </p>
      </div>

      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex flex-col gap-4">
        <h2 className="text-[15px] font-semibold text-on-surface">Account</h2>
        {user ? (
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[13px]">
            <Item label="Name" value={user.full_name || '—'} />
            <Item label="Email" value={user.email} />
            <Item label="Role" value={user.role?.name || '—'} />
          </dl>
        ) : (
          <p className="text-[13px] text-secondary">Loading...</p>
        )}
        <p className="text-[12px] text-on-surface-variant">To change your name, role or password, contact an administrator.</p>
      </section>

      {isAdmin && <AiStatus />}
    </div>
  );
}

function Item({ label, value }) {
  return (
    <div>
      <dt className="text-[11px] text-secondary uppercase tracking-wider font-semibold">{label}</dt>
      <dd className="text-on-surface mt-1 break-words">{value}</dd>
    </div>
  );
}

function AiStatus() {
  const [health, setHealth] = useState(null);
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState(null);
  const [problem, setProblem] = useState('');

  const check = useCallback(async () => {
    setChecking(true);
    try {
      setHealth(await aiService.healthCheck());
      setProblem('');
    } catch (err) {
      // e.g. 503 when no provider is configured: show it as the service state, not just a toast
      setHealth(null);
      setProblem(getErrorMessage(err, 'Could not check the AI service.'));
      notifyError(err, 'Could not check the AI service.');
    } finally {
      setCheckedAt(new Date());
      setChecking(false);
    }
  }, []);

  useEffect(() => { check(); }, [check]);

  return (
    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-on-surface">AI Provider</h2>
        <button onClick={check} disabled={checking} className={secondaryButton}>
          <span className={`material-symbols-outlined text-[18px] ${checking ? 'animate-spin' : ''}`}>refresh</span>
          {checking ? 'Checking...' : 'Check again'}
        </button>
      </div>
      {health ? (
        <div className="flex items-start gap-3">
          <span className={`material-symbols-outlined text-[28px] ${health.available ? 'text-primary' : 'text-error'}`}>
            {health.available ? 'check_circle' : 'error'}
          </span>
          <div className="text-[13px]">
            <p className="font-semibold text-on-surface">{health.available ? 'Available' : 'Unavailable'}</p>
            <p className="text-on-surface-variant mt-0.5">
              {health.available
                ? `Responded in ${health.latency_ms ?? '—'} ms.`
                : `Question generation will fail until this is resolved${health.error_category ? ` (${enumLabel(health.error_category)})` : ''}.`}
            </p>
            {checkedAt && <p className="text-[11px] text-outline mt-1">Checked {checkedAt.toLocaleTimeString()}</p>}
          </div>
        </div>
      ) : problem ? (
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-[28px] text-error">error</span>
          <div className="text-[13px]">
            <p className="font-semibold text-on-surface">Unavailable</p>
            <p className="text-on-surface-variant mt-0.5">{problem}</p>
            {checkedAt && <p className="text-[11px] text-outline mt-1">Checked {checkedAt.toLocaleTimeString()}</p>}
          </div>
        </div>
      ) : (
        <p className="text-[13px] text-secondary">{checking ? 'Contacting the AI provider...' : 'Status unknown.'}</p>
      )}
      <p className="text-[12px] text-on-surface-variant">
        The model and API key are set on the server (backend <code>.env</code>); they cannot be changed from the browser.
      </p>
    </section>
  );
}
