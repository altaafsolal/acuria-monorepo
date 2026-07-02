import StatCard from '../ui/StatCard';
import type { CountStats } from '../../types';
import './StatsSection.css';

interface StatsSectionProps {
  title: string;
  stats: CountStats;
}

export default function StatsSection({ title, stats }: StatsSectionProps) {
  return (
    <section className="stats-section">
      <h2 className="stats-section__title">{title}</h2>
      <div className="stats-grid">
        <StatCard label={`Total ${title}`} value={stats.total} variant="total" />
        <StatCard label={`${title} actifs`} value={stats.active} variant="active" />
        <StatCard label={`${title} inactifs`} value={stats.inactive} variant="inactive" />
      </div>
    </section>
  );
}
