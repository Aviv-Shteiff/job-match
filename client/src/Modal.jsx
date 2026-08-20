import { useEffect } from 'react';

// A generic in-app confirmation modal — replaces window.confirm() for both
// delete (C19: "takes one confirmation") and recalculate-all (turn-5 Q3),
// reusing the same component with different text rather than building two.
// No dependency: a controlled component, rendered conditionally by the parent.
export default function Modal({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="modal-actions">
          <button type="button" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className={danger ? 'modal-confirm danger' : 'modal-confirm'} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
