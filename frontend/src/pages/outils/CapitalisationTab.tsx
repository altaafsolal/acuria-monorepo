import { useEffect, useMemo, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const fmt = (n: number, dec = 0) =>
  isNaN(n) || !isFinite(n) ? '—' : n.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtE = (n: number) => fmt(n) + ' €';

export default function CapitalisationTab() {
  const [mode, setMode] = useState<'A' | 'B'>('A');
  const [versementInitial, setVersementInitial] = useState(50000);
  const [versementMensuel, setVersementMensuel] = useState(500);
  const [rendement, setRendement] = useState(5);
  const [duree, setDuree] = useState(20);
  const [capitalCible, setCapitalCible] = useState(1000000);
  const chartRef = useRef<Chart | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { capitalFinal, totalVerse, plusValue, labels, dataCapital, dataVerse } = useMemo(() => {
    const tm = rendement / 100 / 12;
    const n = duree * 12;
    let cf: number;
    let tv: number;

    if (mode === 'A') {
      if (tm === 0) {
        cf = versementInitial + versementMensuel * n;
      } else {
        cf = versementInitial * Math.pow(1 + tm, n) +
          versementMensuel * (Math.pow(1 + tm, n) - 1) / tm;
      }
      tv = versementInitial + versementMensuel * n;
    } else {
      // Mode B: target = capitalCible, solve for versementMensuel given versementInitial
      if (tm === 0) {
        cf = capitalCible;
        tv = capitalCible;
      } else {
        const growthInitial = versementInitial * Math.pow(1 + tm, n);
        const neededFromMonthly = capitalCible - growthInitial;
        const solvedMensuel = neededFromMonthly > 0
          ? neededFromMonthly * tm / (Math.pow(1 + tm, n) - 1)
          : 0;
        cf = capitalCible;
        tv = versementInitial + solvedMensuel * n;
      }
    }

    const pv = cf - tv;

    const lbls: string[] = [];
    const cap: number[] = [];
    const ver: number[] = [];
    for (let y = 1; y <= duree; y++) {
      const ny = y * 12;
      const capy = tm === 0
        ? versementInitial + versementMensuel * ny
        : versementInitial * Math.pow(1 + tm, ny) + versementMensuel * (Math.pow(1 + tm, ny) - 1) / tm;
      lbls.push(`An ${y}`);
      cap.push(Math.round(capy));
      ver.push(Math.round(versementInitial + versementMensuel * ny));
    }

    return { capitalFinal: cf, totalVerse: tv, plusValue: pv, labels: lbls, dataCapital: cap, dataVerse: ver };
  }, [mode, versementInitial, versementMensuel, rendement, duree, capitalCible]);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Capital accumulé',
            data: dataCapital,
            borderColor: '#002060',
            backgroundColor: 'rgba(0,32,96,0.08)',
            fill: true,
            tension: 0.3,
            pointRadius: 0,
          },
          {
            label: 'Total versé',
            data: dataVerse,
            borderColor: '#BE845C',
            backgroundColor: 'transparent',
            borderDash: [5, 4],
            fill: false,
            tension: 0.3,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } },
        scales: { y: { ticks: { callback: (v) => fmtE(Number(v)) } } },
      },
    });
    return () => { chartRef.current?.destroy(); };
  }, [dataCapital.join(','), dataVerse.join(','), labels.join(',')]);

  return (
    <div className="sim-layout">
      <div className="sim-inputs">
        <div className="card card--padded">
          <div className="sim-mode-toggle">
            <button
              type="button"
              className={mode === 'A' ? 'btn btn-bronze btn-sm' : 'btn btn-secondary btn-sm'}
              onClick={() => setMode('A')}
            >
              Mode A — Projection
            </button>
            <button
              type="button"
              className={mode === 'B' ? 'btn btn-bronze btn-sm' : 'btn btn-secondary btn-sm'}
              onClick={() => setMode('B')}
            >
              Mode B — Objectif
            </button>
          </div>

          <div className="sim-field">
            <label>Versement initial (€)</label>
            <input type="number" value={versementInitial} min={0} onChange={(e) => setVersementInitial(Number(e.target.value))} />
          </div>
          {mode === 'A' && (
            <div className="sim-field">
              <label>Versement mensuel (€)</label>
              <input type="number" value={versementMensuel} min={0} onChange={(e) => setVersementMensuel(Number(e.target.value))} />
            </div>
          )}
          {mode === 'B' && (
            <div className="sim-field">
              <label>Capital cible (€)</label>
              <input type="number" value={capitalCible} min={0} onChange={(e) => setCapitalCible(Number(e.target.value))} />
            </div>
          )}
          <div className="sim-field">
            <label>Rendement annuel (%)</label>
            <input type="number" value={rendement} step={0.1} min={0} onChange={(e) => setRendement(Number(e.target.value))} />
          </div>
          <div className="sim-field">
            <label>Durée (ans)</label>
            <input type="number" value={duree} min={1} max={50} onChange={(e) => setDuree(Number(e.target.value))} />
          </div>
        </div>
      </div>

      <div className="sim-results">
        <div className="sim-stats-grid" style={{ marginBottom: 16 }}>
          <div className="stat-card">
            <div className="stat-label">Capital final</div>
            <div className="stat-val" style={{ fontSize: 22, color: 'var(--green)' }}>{fmtE(capitalFinal)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total versé</div>
            <div className="stat-val" style={{ fontSize: 22 }}>{fmtE(totalVerse)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Plus-value</div>
            <div className="stat-val" style={{ fontSize: 22, color: 'var(--bronze)' }}>{fmtE(plusValue)}</div>
          </div>
        </div>

        <div className="card card--padded sim-chart-wrap" style={{ height: 240, padding: '16px 16px 8px' }}>
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  );
}
