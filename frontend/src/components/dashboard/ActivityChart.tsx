import { memo } from 'react';
import type { ChartDataItem } from '../../types';
import './ActivityChart.css';

interface ActivityChartProps {
  data: ChartDataItem[];
}

function ActivityChart({ data }: ActivityChartProps) {
  const maxValue = Math.max(
    ...data.flatMap((item) => [item.active, item.inactive]),
    1,
  );

  return (
    <section className="chart-section">
      <h2 className="stats-section__title">Vue d&apos;activité</h2>
      <div className="chart-card">
        <div className="chart-legend">
          <span><i className="legend-dot legend-dot--active" /> Actif</span>
          <span><i className="legend-dot legend-dot--inactive" /> Inactif</span>
        </div>
        <div className="chart-bars">
          {data.map((item) => (
            <div key={item.label} className="chart-group">
              <div className="chart-group__bars">
                <div
                  className="chart-bar chart-bar--active"
                  style={{ height: `${(item.active / maxValue) * 100}%` }}
                  title={`${item.active} actifs`}
                />
                <div
                  className="chart-bar chart-bar--inactive"
                  style={{ height: `${(item.inactive / maxValue) * 100}%` }}
                  title={`${item.inactive} inactifs`}
                />
              </div>
              <span className="chart-group__label">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default memo(ActivityChart);
