import { memo } from 'react';
import { KYC_STATUS_LABELS } from '../../constants/roles';

interface KycBadgeProps {
  status: string;
}

function KycBadge({ status }: KycBadgeProps) {
  const label = KYC_STATUS_LABELS[status] || status;

  return (
    <span className={`kyc-badge kyc-badge--${status}`}>
      {label}
    </span>
  );
}

export default memo(KycBadge);
