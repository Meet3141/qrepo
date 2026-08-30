import './ErrorMessage.css';

interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
}

export const ErrorMessage = ({ message, onDismiss }: ErrorMessageProps) => (
  <div className="error-message" role="alert">
    <span className="error-message-icon" aria-hidden="true">⚠</span>
    <span className="error-message-text">{message}</span>
    {onDismiss && (
      <button
        className="error-message-dismiss"
        onClick={onDismiss}
        aria-label="Dismiss error"
      >
        ×
      </button>
    )}
  </div>
);
