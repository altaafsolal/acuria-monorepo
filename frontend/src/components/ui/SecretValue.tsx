import { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';

interface SecretValueProps {
  label: string;
  value: string | null | undefined;
}

export default function SecretValue({ label, value }: SecretValueProps) {
  const [visible, setVisible] = useState(false);
  const hasValue = Boolean(value?.trim());
  const masked = hasValue ? '••••••••••••' : '—';

  return (
    <div className="secret-value">
      <span className="secret-value__label">{label}</span>
      <code className="secret-value__text">{visible && hasValue ? value : masked}</code>
      {hasValue && (
        <button
          type="button"
          className="secret-value__toggle"
          onClick={() => setVisible((open) => !open)}
          aria-label={visible ? `Masquer ${label}` : `Afficher ${label}`}
          title={visible ? 'Masquer' : 'Afficher'}
        >
          {visible ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
        </button>
      )}
    </div>
  );
}
