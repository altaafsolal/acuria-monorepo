import clsx from 'clsx';
import { useEffect, useRef, type ReactNode } from 'react';
import { FiAlertTriangle, FiHelpCircle } from 'react-icons/fi';
import type { ConfirmVariant } from '../../context/ConfirmContext';

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

const ICON_CLASSES: Record<string, string> = {
  default: 'bg-[color-mix(in_srgb,var(--color-bronze)_15%,transparent)] text-[var(--color-bronze)]',
  danger:  'bg-[color-mix(in_srgb,#dc2626_12%,transparent)] text-[#dc2626]',
};

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
    <div
      className="fixed inset-0 z-[600] grid place-items-center p-4 bg-[rgba(13,27,64,0.5)] backdrop-blur-[3px] animate-confirm-fade"
      onClick={onCancel}
    >
      <div
        className="w-[min(100%,420px)] bg-white rounded-[14px] p-[1.75rem_1.5rem_1.5rem] text-center shadow-md animate-confirm-pop"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={clsx(
          'inline-flex items-center justify-center w-12 h-12 mb-4 rounded-full text-2xl',
          ICON_CLASSES[variant],
        )}>
          <Icon className="w-6 h-6" aria-hidden="true" />
        </div>
        <h2 id="confirm-title" className="m-0 font-display text-[1.35rem] text-[var(--color-navy)]">{title}</h2>
        {message && <div className="mt-[0.6rem] text-[var(--color-muted)] text-[0.92rem] leading-[1.5]">{message}</div>}
        <div className="flex justify-center gap-[0.6rem] mt-6">
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
