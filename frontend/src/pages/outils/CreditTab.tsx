import { useEffect, useMemo, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const fmt = (n: number, dec = 0) =>
  isNaN(n) ? '—' : n.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtE = (n: number, dec = 0) => fmt(n, dec) + ' €';
const fmtP = (n: number) => fmt(n, 2) + ' %';

interface AmortRow {
  mois: number;
  mensualite: number;
  interets: number;
  amortissement: number;
  capitalRestant: number;
}

function buildAmort(capital: number, tauxAnnuel: number, dureeAns: number): AmortRow[] {
  if (!capital || !tauxAnnuel || !dureeAns) return [];
  const tm = tauxAnnuel / 100 / 12;
  const n = dureeAns * 12;
  const mensualite = capital * tm * Math.pow(1 + tm, n) / (Math.pow(1 + tm, n) - 1);
  const rows: AmortRow[] = [];
  let restant = capital;
  for (let m = 1; m <= n; m++) {
    const interets = restant * tm;
    const amort = mensualite - interets;
    restant = Math.max(0, restant - amort);
    rows.push({ mois: m, mensualite, interets, amortissement: amort, capitalRestant: restant });
  }
  return rows;
}

export default function CreditTab() {
  const [capital, setCapital] = useState(300000);
  const [taux, setTaux] = useState(3.5);
  const [duree, setDuree] = useState(20);
  const [assurance, setAssurance] = useState(0);
  const [amortView, setAmortView] = useState<'mensuel' | 'annuel'>('annuel');
  const chartRef = useRef<Chart | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const amort = useMemo(() => buildAmort(capital, taux, duree), [capital, taux, duree]);

  const mensualite = amort[0]?.mensualite ?? 0;
  const mensualiteTotale = mensualite + assurance;
  const totalInteret = amort.reduce((s, r) => s + r.interets, 0);
  const totalAssurance = assurance * duree * 12;
  const coutTotal = capital + totalInteret + totalAssurance;
  // Build annual aggregates for chart
  const annualLabels: string[] = [];
  const annualCapital: number[] = [];
  const annualInterets: number[] = [];
  for (let y = 1; y <= duree; y++) {
    const lastRowOfYear = amort[Math.min(y * 12, amort.length) - 1];
    if (!lastRowOfYear) continue;
    annualLabels.push(`An ${y}`);
    annualCapital.push(Math.round(lastRowOfYear.capitalRestant));
    annualInterets.push(Math.round(amort.slice(0, y * 12).reduce((s, r) => s + r.interets, 0)));
  }

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: annualLabels,
        datasets: [
          {
            label: 'Capital restant dû',
            data: annualCapital,
            borderColor: '#002060',
            backgroundColor: 'rgba(0,32,96,0.08)',
            fill: true,
            tension: 0.3,
            pointRadius: 0,
          },
          {
            label: 'Intérêts cumulés',
            data: annualInterets,
            borderColor: '#BE845C',
            backgroundColor: 'rgba(190,132,92,0.08)',
            fill: true,
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
  }, [annualCapital.join(','), annualLabels.join(','), annualInterets.join(',')]);

  // Build table rows
  const tableRows = amortView === 'mensuel'
    ? amort
    : Array.from({ length: duree }, (_, i) => {
        const yearRows = amort.slice(i * 12, (i + 1) * 12);
        return {
          mois: i + 1,
          mensualite: yearRows[0]?.mensualite ?? 0,
          interets: yearRows.reduce((s, r) => s + r.interets, 0),
          amortissement: yearRows.reduce((s, r) => s + r.amortissement, 0),
          capitalRestant: yearRows[yearRows.length - 1]?.capitalRestant ?? 0,
        };
      });

  return (
    <div className="sim-layout">
      <div className="sim-inputs">
        <div className="card card--padded">
          <div className="sim-field">
            <label>Capital emprunté (€)</label>
            <input type="number" value={capital} min={0} onChange={(e) => setCapital(Number(e.target.value))} />
          </div>
          <div className="sim-field">
            <label>Taux annuel (%)</label>
            <input type="number" value={taux} step={0.1} min={0} onChange={(e) => setTaux(Number(e.target.value))} />
          </div>
          <div className="sim-field">
            <label>Durée (ans)</label>
            <input type="number" value={duree} min={1} max={30} onChange={(e) => setDuree(Number(e.target.value))} />
          </div>
          <div className="sim-field">
            <label>Assurance mensuelle (€)</label>
            <input type="number" value={assurance} min={0} onChange={(e) => setAssurance(Number(e.target.value))} />
          </div>
        </div>
      </div>

      <div className="sim-results">
        <div className="sim-stats-grid" style={{ marginBottom: 16 }}>
          <div className="stat-card">
            <div className="stat-label">Mensualité hors assurance</div>
            <div className="stat-val" style={{ fontSize: 20 }}>{fmtE(mensualite, 2)}</div>
          </div>
          <div className="stat-card" style={{ borderColor: 'var(--bronze)' }}>
            <div className="stat-label">Mensualité totale</div>
            <div className="stat-val" style={{ fontSize: 20, color: 'var(--bronze)' }}>{fmtE(mensualiteTotale, 2)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Coût total du crédit</div>
            <div className="stat-val" style={{ fontSize: 20, color: 'var(--red)' }}>{fmtE(coutTotal)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total intérêts</div>
            <div className="stat-val" style={{ fontSize: 20 }}>{fmtE(totalInteret)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total assurance</div>
            <div className="stat-val" style={{ fontSize: 20 }}>{fmtE(totalAssurance)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Taux endettement indicatif</div>
            <div className="stat-val" style={{ fontSize: 20 }}>{fmtP(mensualiteTotale > 0 ? 33 : 0)}</div>
            <div className="stat-sub">Calcul basé sur 33%</div>
          </div>
        </div>

        <div className="card card--padded sim-chart-wrap" style={{ height: 200, padding: '16px 16px 8px' }}>
          <canvas ref={canvasRef} />
        </div>

        <div className="card card--padded" style={{ marginTop: 16 }}>
          <div className="sim-amort-toggle">
            <button
              type="button"
              className={amortView === 'annuel' ? 'btn btn-bronze btn-sm' : 'btn btn-secondary btn-sm'}
              onClick={() => setAmortView('annuel')}
            >
              Annuel
            </button>
            <button
              type="button"
              className={amortView === 'mensuel' ? 'btn btn-bronze btn-sm' : 'btn btn-secondary btn-sm'}
              onClick={() => setAmortView('mensuel')}
            >
              Mensuel
            </button>
          </div>
          <div className="sim-table-wrap">
            <table className="sim-table">
              <thead>
                <tr>
                  <th>{amortView === 'mensuel' ? 'Mois' : 'Année'}</th>
                  <th>Mensualité</th>
                  <th>Intérêts</th>
                  <th>Amortissement</th>
                  <th>Capital restant</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => (
                  <tr key={row.mois}>
                    <td>{row.mois}</td>
                    <td>{fmtE(row.mensualite, 2)}</td>
                    <td>{fmtE(row.interets, 2)}</td>
                    <td>{fmtE(row.amortissement, 2)}</td>
                    <td>{fmtE(row.capitalRestant, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
