import type { Unit } from '../../types/subject';
import { EmptyState } from '../../components/ui/EmptyState';
import './UnitList.css';

interface UnitListProps {
  units: Unit[];
  /** Whether the current user can add / edit / delete units in this subject. */
  canManage: boolean;
  onAdd: () => void;
  onEdit: (unit: Unit) => void;
  onDelete: (unit: Unit) => void;
}

/**
 * Embedded unit list rendered inside SubjectDetail.
 * Sorted by unit_number ascending.
 */
export const UnitList = ({
  units,
  canManage,
  onAdd,
  onEdit,
  onDelete,
}: UnitListProps) => {
  const sorted = [...units].sort((a, b) => a.unit_number - b.unit_number);

  return (
    <section className="unit-list-section">
      <div className="unit-list-header">
        <h3 className="unit-list-title">Units</h3>
        {canManage && (
          <button className="unit-add-btn" onClick={onAdd} id="add-unit-btn">
            + Add Unit
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon="📂"
          title="No units yet"
          message={
            canManage
              ? 'Add the first unit to get started.'
              : 'No units have been added to this subject.'
          }
          action={canManage ? { label: 'Add Unit', onClick: onAdd } : undefined}
        />
      ) : (
        <ol className="unit-list" aria-label="Units">
          {sorted.map((unit) => (
            <li key={unit.id} className="unit-item">
              {/* Unit number badge */}
              <div className="unit-number-badge" aria-label={`Unit ${unit.unit_number}`}>
                {unit.unit_number}
              </div>

              {/* Content */}
              <div className="unit-content">
                <p className="unit-title">{unit.title}</p>
                {unit.description && (
                  <p className="unit-description">{unit.description}</p>
                )}
              </div>

              {/* Actions */}
              {canManage && (
                <div className="unit-actions">
                  <button
                    className="unit-btn-edit"
                    onClick={() => onEdit(unit)}
                    aria-label={`Edit unit ${unit.unit_number}`}
                  >
                    Edit
                  </button>
                  <button
                    className="unit-btn-delete"
                    onClick={() => onDelete(unit)}
                    aria-label={`Delete unit ${unit.unit_number}`}
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};
