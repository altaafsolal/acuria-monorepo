import { memo } from 'react';
import type { ChartDataItem } from '../../types';

interface ActivityChartProps {
  data: ChartDataItem[];
}

function ActivityChart({ data }: ActivityChartProps) {
  const maxValue = Math.max(
    ...data.flatMap((item) => [item.active, item.inactive]),
    1,
  );

  return (
    <section className="mt-8">
      <h2 className="m-0 mb-[0.85rem] text-[1rem] font-semibold text-[#334155]">Vue d&apos;activité</h2>
      <div className="p-6 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm">
        <div className="flex gap-5 mb-5 text-[0.85rem] text-[var(--color-muted)]">
          <span className="inline-flex items-center gap-[0.4rem]">
            <i className="inline-block w-[10px] h-[10px] rounded-full bg-[#22c55e]" /> Actif
          </span>
          <span className="inline-flex items-center gap-[0.4rem]">
            <i className="inline-block w-[10px] h-[10px] rounded-full bg-[#f59e0b]" /> Inactif
          </span>
        </div>
        <div className="flex items-end justify-around gap-6 h-[180px] pt-2">
          {data.map((item) => (
            <div key={item.label} className="flex flex-1 flex-col items-center gap-[0.65rem] max-w-[120px]">
              <div className="flex items-end justify-center gap-2 w-full h-[150px]">
                <div
                  className="w-7 min-h-1 rounded-t-md rounded-b-sm bg-gradient-to-b from-[#4ade80] to-[#16a34a] transition-[height] duration-300"
                  style={{ height: `${(item.active / maxValue) * 100}%` }}
                  title={`${item.active} actifs`}
                />
                <div
                  className="w-7 min-h-1 rounded-t-md rounded-b-sm bg-gradient-to-b from-[#fbbf24] to-[#d97706] transition-[height] duration-300"
                  style={{ height: `${(item.inactive / maxValue) * 100}%` }}
                  title={`${item.inactive} inactifs`}
                />
              </div>
              <span className="text-[0.8rem] font-medium text-[#475569]">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default memo(ActivityChart);
