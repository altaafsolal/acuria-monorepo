import { useEffect, useMemo, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const fmt = (n: number, dec = 0) =>
  isNaN(n) || !isFinite(n) ? '—' : n.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtE = (n: number, dec = 0) => fmt(n, dec) + ' €';
const fmtP = (n: number, dec = 2) => fmt(n, dec) + ' %';

const BAREME_IFI = [
  { min: 0, max: 800000, taux: 0, label: '0 – 800 000 €' },
  { min: 800001, max: 1300000, taux: 0.005, label: '800 001 – 1 300 000 €' },
  { min: 1300001, max: 2570000, taux: 0.007, label: '1 300 001 – 2 570 000 €' },
  { min: 2570001, max: 5000000, taux: 0.010, label: '2 570 001 – 5 000 000 €' },
  { min: 5000001, max: 10000000, taux: 0.0125, label: '5 000 001 – 10 000 000 €' },
  { min: 10000001, max: Infinity, taux: 0.015, label: '> 10 000 000 €' },
];

function calcIFI(actifNet: number): { impot: number; tranches: Array<{ label: string; taux: number; base: number; impot: number }> } {
  if (actifNet <= 800000) return { impot: 0, tranches: [] };
  let impot = 0;
  const tranches: Array<{ label: string; taux: number; base: number; impot: number }> = [];
  for (const t of BAREME_IFI) {
    if (t.taux === 0) continue;
    if (actifNet <= t.min) break;
    const base = Math.min(actifNet, t.max) - t.min;
    const imp = base * t.taux;
    impot += imp;
    tranches.push({ label: t.label, taux: t.taux, base, impot: imp });
  }
  return { impot, tranches };
}

export default function IFITab() {
  const [rp, setRp] = useState(0);
  const [autresImmo, setAutresImmo] = useState(0);
  const [scpi, setScpi] = useState(0);
  const [uc, setUc] = useState(0);
  const [autresActifs, setAutresActifs] = useState(0);
  const [emprunts, setEmprunts] = useState(0);
  const [autresDettes, setAutresDettes] = useState(0);
  const chartRef = useRef<Chart | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const calc = useMemo(() => {
    const rpNet = rp * 0.70;
    const actifBrut = rpNet + autresImmo + scpi + uc + autresActifs;
    const passif = emprunts + autresDettes;
    const actifNet = Math.max(0, actifBrut - passif);
    const { impot, tranches } = calcIFI(actifNet);
    const tauxEffectif = actifNet > 0 ? (impot / actifNet) * 100 : 0;
    return { rpNet, actifBrut, actifNet, impot, tauxEffectif, tranches };
  }, [rp, autresImmo, scpi, uc, autresActifs, emprunts, autresDettes]);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();
    const total = calc.actifBrut || 1;
    chartRef.current = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels: ['Résidence principale (−30%)', 'Autres biens immo', 'SCI / SCPI / OPCI', 'UC immo', 'Autres actifs'],
        datasets: [{
          data: [
            Math.round(calc.rpNet),
            autresImmo,
            scpi,
            uc,
            autresActifs,
          ],
          backgroundColor: [
            'rgba(0,32,96,0.8)',
            'rgba(0,32,96,0.55)',
            'rgba(190,132,92,0.8)',
            'rgba(190,132,92,0.5)',
            'rgba(190,132,92,0.3)',
          ],
          borderWidth: 1,
          borderColor: '#fff',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12 } },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${fmtE(Number(ctx.raw))} (${fmtP((Number(ctx.raw) / total) * 100, 1)})`,
            },
          },
        },
      },
    });
    return () => { chartRef.current?.destroy(); };
  }, [calc.rpNet, autresImmo, scpi, uc, autresActifs, calc.actifBrut]);

  const nonAssujetti = calc.actifNet < 800000;

  return (
    <div className="sim-layout">
      <div className="sim-inputs" style={{ width: 360 }}>
        <div className="card card--padded" style={{ marginBottom: 12 }}>
          <div className="card-title" style={{ marginBottom: 12, fontSize: 13 }}>🏠 Actifs imposables</div>
          <div className="sim-field">
            <label>Résidence principale (€) — abatt. 30%</label>
            <input type="number" value={rp} min={0} onChange={(e) => setRp(Number(e.target.value))} />
          </div>
          <div className="sim-field">
            <label>Autres biens immobiliers (€)</label>
            <input type="number" value={autresImmo} min={0} onChange={(e) => setAutresImmo(Number(e.target.value))} />
          </div>
          <div className="sim-field">
            <label>Parts SCI / SCPI / OPCI (€)</label>
            <input type="number" value={scpi} min={0} onChange={(e) => setScpi(Number(e.target.value))} />
          </div>
          <div className="sim-field">
            <label>Quote-part UC immo ass.-vie (€)</label>
            <input type="number" value={uc} min={0} onChange={(e) => setUc(Number(e.target.value))} />
          </div>
          <div className="sim-field">
            <label>Autres actifs IFI (€)</label>
            <input type="number" value={autresActifs} min={0} onChange={(e) => setAutresActifs(Number(e.target.value))} />
          </div>
        </div>

        <div className="card card--padded">
          <div className="card-title" style={{ marginBottom: 12, fontSize: 13 }}>📉 Passif déductible</div>
          <div className="sim-field">
            <label>Emprunts immobiliers restants (€)</label>
            <input type="number" value={emprunts} min={0} onChange={(e) => setEmprunts(Number(e.target.value))} />
          </div>
          <div className="sim-field">
            <label>Autres dettes déductibles (€)</label>
            <input type="number" value={autresDettes} min={0} onChange={(e) => setAutresDettes(Number(e.target.value))} />
          </div>
        </div>
      </div>

      <div className="sim-results">
        <div className="sim-stats-grid sim-stats-grid--2" style={{ marginBottom: 16 }}>
          <div className="stat-card">
            <div className="stat-label">Actif brut IFI</div>
            <div className="stat-val" style={{ fontSize: 20 }}>{fmtE(calc.actifBrut)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Actif net IFI</div>
            <div className="stat-val" style={{ fontSize: 20, color: 'var(--navy)' }}>{fmtE(calc.actifNet)}</div>
          </div>
          <div className="stat-card" style={{ borderColor: nonAssujetti ? 'var(--green)' : 'var(--red)' }}>
            <div className="stat-label">IFI dû</div>
            <div className="stat-val" style={{ fontSize: 26, color: nonAssujetti ? 'var(--green)' : 'var(--red)' }}>
              {nonAssujetti ? 'Non assujetti' : fmtE(calc.impot)}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Taux effectif</div>
            <div className="stat-val" style={{ fontSize: 26, color: 'var(--orange)' }}>
              {nonAssujetti ? '0 %' : fmtP(calc.tauxEffectif)}
            </div>
          </div>
        </div>

        {!nonAssujetti && calc.tranches.length > 0 && (
          <div className="card card--padded" style={{ marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 10, fontSize: 13 }}>Détail par tranche</div>
            {calc.tranches.map((t) => (
              <div key={t.label} className="loc-line">
                <span>{t.label} × {fmtP(t.taux * 100)}</span>
                <span>{fmtE(t.impot)}</span>
              </div>
            ))}
            <div className="loc-line total"><span>Total IFI</span><span>{fmtE(calc.impot)}</span></div>
          </div>
        )}

        <div className="card card--padded" style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
          <div style={{ maxWidth: 280, width: '100%', height: 280 }}>
            <canvas ref={canvasRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
