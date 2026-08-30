import './Spinner.css';

interface SpinnerProps {
  /** Visual size preset. Default: 'md'. */
  size?: 'sm' | 'md' | 'lg';
  /** Optional accessible label shown below the ring. */
  label?: string;
}

export const Spinner = ({ size = 'md', label }: SpinnerProps) => (
  <div
    className={`spinner-wrapper spinner-${size}`}
    role="status"
    aria-label={label ?? 'Loading…'}
  >
    <div className="spinner-ring" />
    {label && <span className="spinner-label">{label}</span>}
  </div>
);
