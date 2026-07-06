import clsx from 'clsx';
import { memo } from 'react';

type StatVariant = 'default' | 'total' | 'active' | 'inactive';

export type { StatVariant };

interface StatCardProps {
  label: string;
  value: number | string;
  variant?: StatVariant;
}

const VALUE_COLOR: Record<StatVariant, string> = {
  default:  'text-[var(--color-text)]',
  total:    'text-[var(--color-navy)]',
  active:   'text-[#15803d]',
  inactive: 'text-[#b45309]',
};

function StatCard({ label, value, variant = 'default' }: StatCardProps) {
  return (
    <div className="p-[1.25rem_1.35rem] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm">
      <span className={clsx('block text-[1.75rem] font-bold tracking-tight leading-[1.2]', VALUE_COLOR[variant])}>
        {value}
      </span>
      <span className="block mt-[0.35rem] text-[0.85rem] text-[var(--color-muted)]">{label}</span>
    </div>
  );
}

export default memo(StatCard);
