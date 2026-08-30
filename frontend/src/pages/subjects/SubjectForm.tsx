import { useState, useEffect } from 'react';
import type { Subject, SubjectCreate, SubjectUpdate } from '../../types/subject';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import './SubjectForm.css';

interface SubjectFormProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  subject?: Subject;
  onSave: (data: SubjectCreate | SubjectUpdate) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  error?: string | null;
}

const EMPTY: SubjectCreate = { name: '', code: '', description: '', faculty_id: '' };

/**
 * Modal form for creating or editing a Subject.
 * Shared for both Admin and HOD roles.
 * faculty_id is an optional UUID string — left blank means "unassigned".
 */
export const SubjectForm = ({
  isOpen,
  mode,
  subject,
  onSave,
  onCancel,
  isLoading,
  error,
}: SubjectFormProps) => {
  const [fields, setFields] = useState<SubjectCreate>(EMPTY);
  const [validationError, setValidationError] = useState('');

  // Populate fields when opening in edit mode
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && subject) {
        setFields({
          name: subject.name,
          code: subject.code,
          description: subject.description ?? '',
          faculty_id: subject.faculty_id ?? '',
        });
      } else {
        setFields(EMPTY);
      }
      setValidationError('');
    }
  }, [isOpen, mode, subject]);

  if (!isOpen) return null;

  const set = (key: keyof SubjectCreate, value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!fields.name.trim()) {
      setValidationError('Subject name is required.');
      return;
    }
    if (!fields.code.trim()) {
      setValidationError('Subject code is required.');
      return;
    }

    // Build payload — omit empty optional strings
    const payload: SubjectCreate | SubjectUpdate = {
      name: fields.name.trim(),
      code: fields.code.trim().toUpperCase(),
      ...(fields.description?.trim() ? { description: fields.description.trim() } : {}),
      ...(fields.faculty_id?.trim()  ? { faculty_id:  fields.faculty_id.trim()  } : {}),
    };

    await onSave(payload);
  };

  return (
    <div
      className="sf-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sf-title"
      onClick={onCancel}
    >
      <div className="sf-card" onClick={(e) => e.stopPropagation()}>
        <div className="sf-header">
          <h2 id="sf-title" className="sf-title">
            {mode === 'create' ? 'Create Subject' : 'Edit Subject'}
          </h2>
          <button
            className="sf-close"
            onClick={onCancel}
            aria-label="Close form"
            disabled={isLoading}
          >
            ×
          </button>
        </div>

        {(validationError || error) && (
          <ErrorMessage
            message={validationError || error!}
            onDismiss={() => setValidationError('')}
          />
        )}

        <form onSubmit={handleSubmit} className="sf-form" noValidate>
          <div className="sf-field">
            <label htmlFor="sf-name">Subject Name <span className="sf-required">*</span></label>
            <input
              id="sf-name"
              type="text"
              value={fields.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Data Structures and Algorithms"
              disabled={isLoading}
              maxLength={255}
              required
            />
          </div>

          <div className="sf-field">
            <label htmlFor="sf-code">Subject Code <span className="sf-required">*</span></label>
            <input
              id="sf-code"
              type="text"
              value={fields.code}
              onChange={(e) => set('code', e.target.value.toUpperCase())}
              placeholder="e.g. CS301"
              disabled={isLoading}
              maxLength={50}
              required
            />
          </div>

          <div className="sf-field">
            <label htmlFor="sf-desc">Description <span className="sf-optional">(optional)</span></label>
            <textarea
              id="sf-desc"
              value={fields.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Brief description of the subject…"
              disabled={isLoading}
              maxLength={500}
              rows={3}
            />
          </div>

          <div className="sf-field">
            <label htmlFor="sf-faculty">
              Faculty ID <span className="sf-optional">(optional — UUID)</span>
            </label>
            <input
              id="sf-faculty"
              type="text"
              value={fields.faculty_id}
              onChange={(e) => set('faculty_id', e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              disabled={isLoading}
            />
          </div>

          <div className="sf-actions">
            <button
              type="button"
              className="sf-btn-cancel"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="sf-btn-save"
              disabled={isLoading}
            >
              {isLoading
                ? (mode === 'create' ? 'Creating…' : 'Saving…')
                : (mode === 'create' ? 'Create Subject' : 'Save Changes')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
