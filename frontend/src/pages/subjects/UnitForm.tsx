import { useState, useEffect } from 'react';
import type { Unit, UnitCreate, UnitUpdate } from '../../types/subject';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import './SubjectForm.css'; // reuses the shared modal form styles (.uf-*)

interface UnitFormProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  unit?: Unit;
  onSave: (data: UnitCreate | UnitUpdate) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  error?: string | null;
}

const EMPTY: UnitCreate = { unit_number: 1, title: '', description: '' };

/**
 * Modal form for creating or editing a Unit within a Subject.
 * Accessible to Admin, HOD, and Faculty (for their assigned subject).
 */
export const UnitForm = ({
  isOpen,
  mode,
  unit,
  onSave,
  onCancel,
  isLoading,
  error,
}: UnitFormProps) => {
  const [fields, setFields] = useState<UnitCreate>(EMPTY);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && unit) {
        setFields({
          unit_number: unit.unit_number,
          title: unit.title,
          description: unit.description ?? '',
        });
      } else {
        setFields(EMPTY);
      }
      setValidationError('');
    }
  }, [isOpen, mode, unit]);

  if (!isOpen) return null;

  const setStr = (key: 'title' | 'description', value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const setNum = (value: string) => {
    const n = parseInt(value, 10);
    if (!isNaN(n) && n > 0) setFields((prev) => ({ ...prev, unit_number: n }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!fields.title.trim()) {
      setValidationError('Unit title is required.');
      return;
    }
    if (fields.unit_number < 1) {
      setValidationError('Unit number must be at least 1.');
      return;
    }

    const payload: UnitCreate | UnitUpdate = {
      unit_number: fields.unit_number,
      title: fields.title.trim(),
      ...(fields.description?.trim() ? { description: fields.description.trim() } : {}),
    };

    await onSave(payload);
  };

  return (
    <div
      className="uf-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="uf-title"
      onClick={onCancel}
    >
      <div className="uf-card" onClick={(e) => e.stopPropagation()}>
        <div className="uf-header">
          <h2 id="uf-title" className="uf-title">
            {mode === 'create' ? 'Add Unit' : 'Edit Unit'}
          </h2>
          <button
            className="uf-close"
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

        <form onSubmit={handleSubmit} className="uf-form" noValidate>
          <div className="uf-field">
            <label htmlFor="uf-num">Unit Number <span className="sf-required">*</span></label>
            <input
              id="uf-num"
              type="number"
              min={1}
              value={fields.unit_number}
              onChange={(e) => setNum(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="uf-field">
            <label htmlFor="uf-title">Unit Title <span className="sf-required">*</span></label>
            <input
              id="uf-title"
              type="text"
              value={fields.title}
              onChange={(e) => setStr('title', e.target.value)}
              placeholder="e.g. Introduction to Sorting Algorithms"
              disabled={isLoading}
              maxLength={255}
              required
            />
          </div>

          <div className="uf-field">
            <label htmlFor="uf-desc">Description <span className="sf-optional">(optional)</span></label>
            <textarea
              id="uf-desc"
              value={fields.description}
              onChange={(e) => setStr('description', e.target.value)}
              placeholder="Brief overview of this unit…"
              disabled={isLoading}
              maxLength={500}
              rows={3}
            />
          </div>

          <div className="uf-actions">
            <button
              type="button"
              className="uf-btn-cancel"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="uf-btn-save"
              disabled={isLoading}
            >
              {isLoading
                ? (mode === 'create' ? 'Adding…' : 'Saving…')
                : (mode === 'create' ? 'Add Unit' : 'Save Changes')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
