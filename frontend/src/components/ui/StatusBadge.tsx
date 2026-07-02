import { memo } from 'react';
import { CLIENT_STATUS_LABELS, TENANT_STATUS_LABELS, USER_STATUS_LABELS } from '../../constants/roles';

interface StatusBadgeProps {
  status: string;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const label = USER_STATUS_LABELS[status]
    ?? TENANT_STATUS_LABELS[status]
    ?? CLIENT_STATUS_LABELS[status]
    ?? status;

  return (
    <span className={`status-badge status-badge--${status}`}>
      {status === 'provisioning' && <span className="status-badge__spinner" aria-hidden="true" />}
      {label}
    </span>
  );
}

export default memo(StatusBadge);
