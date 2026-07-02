import { useEffect, useRef, type ReactNode } from 'react';
import { FiAlertTriangle, FiHelpCircle } from 'react-icons/fi';
import type { ConfirmVariant } from '../../context/ConfirmContext';
import './ConfirmDialog.css';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return undefined;

    confirmButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const Icon = variant === 'danger' ? FiAlertTriangle : FiHelpCircle;

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div
        className="confirm-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`confirm-card__icon confirm-card__icon--${variant}`}>
          <Icon aria-hidden="true" />
        </div>
        <h2 id="confirm-title" className="confirm-card__title">{title}</h2>
        {message && <div className="confirm-card__message">{message}</div>}
        <div className="confirm-card__actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            className={variant === 'danger' ? 'btn-danger' : 'btn-bronze'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
