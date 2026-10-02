import React from 'react';
import { timeAgo } from './ui';

const EVENT_ICONS = {
  user_created: ['person_add', 'text-primary'],
  document_uploaded: ['cloud_upload', 'text-on-surface-variant'],
  document_failed: ['error', 'text-error'],
  ai_generation: ['psychology', 'text-tertiary'],
  paper_submitted: ['send', 'text-secondary'],
  paper_approved: ['check_circle', 'text-primary'],
  paper_rejected: ['cancel', 'text-error'],
  paper_changes_requested: ['edit_note', 'text-secondary'],
};

/** Events from GET /analytics/admin/activity. */
export default function ActivityList({ events }) {
  return events.map((event, i) => {
    const [icon, color] = EVENT_ICONS[event.type] || ['info', 'text-secondary'];
    return (
      <div key={`${event.type}-${event.at}-${i}`} className="flex items-start gap-3 p-3 bg-surface-container/50 rounded-lg">
        <span className={`material-symbols-outlined text-[18px] mt-0.5 shrink-0 ${event.severity === 'error' ? 'text-error' : color}`}>{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] text-on-surface leading-snug break-words">{event.message}</p>
          <span className="text-[10px] text-outline mt-1 block">{timeAgo(event.at)}{event.actor ? ` · ${event.actor}` : ''}</span>
        </div>
      </div>
    );
  });
}
