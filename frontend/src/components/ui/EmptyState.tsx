import './EmptyState.css';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  action?: EmptyStateAction;
}

export const EmptyState = ({
  icon = '📭',
  title,
  message,
  action,
}: EmptyStateProps) => (
  <div className="empty-state">
    <div className="empty-state-icon" aria-hidden="true">{icon}</div>
    <h3 className="empty-state-title">{title}</h3>
    {message && <p className="empty-state-message">{message}</p>}
    {action && (
      <button className="empty-state-action" onClick={action.onClick}>
        {action.label}
      </button>
    )}
  </div>
);
