import StatCard from '../ui/StatCard';
import type { CountStats } from '../../types';

interface StatsSectionProps {
  title: string;
  stats: CountStats;
}

export default function StatsSection({ title, stats }: StatsSectionProps) {
  return (
    <section className="mt-8">
      <h2 className="m-0 mb-[0.85rem] text-[1rem] font-semibold text-[#334155]">{title}</h2>
      <div className="grid grid-cols-3 gap-4 max-[900px]:grid-cols-1">
        <StatCard label={`Total ${title}`} value={stats.total} variant="total" />
        <StatCard label={`${title} actifs`} value={stats.active} variant="active" />
        <StatCard label={`${title} inactifs`} value={stats.inactive} variant="inactive" />
      </div>
    </section>
  );
}
