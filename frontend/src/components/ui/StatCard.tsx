import { memo } from 'react';
import '../dashboard/StatsSection.css';

type StatVariant = 'default' | 'total' | 'active' | 'inactive';

export type { StatVariant };

interface StatCardProps {
  label: string;
  value: number | string;
  variant?: StatVariant;
}

function StatCard({ label, value, variant = 'default' }: StatCardProps) {
  return (
    <div className={`stat-card stat-card--${variant}`}>
      <span className="stat-card__value">{value}</span>
      <span className="stat-card__label">{label}</span>
    </div>
  );
}

export default memo(StatCard);
