import { useEffect, useMemo, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const fmt = (n: number, dec = 0) =>
  isNaN(n) || !isFinite(n) ? '—' : n.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtE = (n: number, dec = 0) => fmt(n, dec) + ' €';
const fmtP = (n: number, dec = 1) => fmt(n, dec) + ' %';

const BAREME_IR_2026 = [
  { min: 0, max: 11600, taux: 0 },
  { min: 11601, max: 29579, taux: 0.11 },
  { min: 29580, max: 84577, taux: 0.30 },
  { min: 84578, max: 181917, taux: 0.41 },
  { min: 181918, max: Infinity, taux: 0.45 },
];

function calcBareme(revenu: number): number {
  if (revenu <= 0) return 0;
  let impot = 0;
  for (const tranche of BAREME_IR_2026) {
    if (revenu <= tranche.min) break;
    const imposable = Math.min(revenu, tranche.max) - tranche.min;
    impot += imposable * tranche.taux;
  }
  return impot;
}

function getNbParts(situation: string, enfants: number): number {
  const base = situation === 'marie' ? 2 : 1;
  if (enfants <= 2) return base + enfants * 0.5;
  return base + 1 + (enfants - 2);
}

export default function IRPPTab() {
  const [situation, setSituation] = useState<'celibataire' | 'marie'>('celibataire');
  const [enfants, setEnfants] = useState(0);
  const [salaires, setSalaires] = useState(60000);
  const [fonciers, setFonciers] = useState(0);
  const [dividendes, setDividendes] = useState(0);
  const [plusValues, setPlusValues] = useState(0);
  const [autres, setAutres] = useState(0);
  const [charges, setCharges] = useState(0);
  const [optionBareme, setOptionBareme] = useState(false);
  const chartRef = useRef<Chart | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const calc = useMemo(() => {
    const nbParts = getNbParts(situation, enfants);

    // Abattement 10% sur salaires
    const abattSal = Math.min(Math.max(salaires * 0.1, 495), 14426);
    const salairesNets = salaires - abattSal;

    // PFU vs barème pour dividendes et plus-values
    let irDividendesPFU = 0;
    let psDividendesPFU = 0;
    let irPVPFU = 0;
    let psPVPFU = 0;
    let dividendesBareme = 0;
    let pvBareme = 0;

    if (!optionBareme) {
      // PFU: 12.8% IR + 17.2% PS
      irDividendesPFU = dividendes * 0.128;
      psDividendesPFU = dividendes * 0.172;
      irPVPFU = plusValues * 0.128;
      psPVPFU = plusValues * 0.172;
    } else {
      // Barème: abattement 40% sur dividendes
      dividendesBareme = dividendes * 0.6;
      pvBareme = plusValues;
    }

    const rni = salairesNets + fonciers + dividendesBareme + pvBareme + autres - charges;
    const rniParPart = rni / nbParts;
    let irBrut = calcBareme(rniParPart) * nbParts;

    // Décote 2026
    if (situation === 'celibataire' && irBrut > 0 && irBrut < 1982) {
      irBrut = Math.max(0, irBrut - (897 - irBrut * 0.4525));
    } else if (situation === 'marie' && irBrut > 0 && irBrut < 3277) {
      irBrut = Math.max(0, irBrut - (1483 - irBrut * 0.4525));
    }

    const irRevenu = irBrut + irDividendesPFU + irPVPFU;
    const prelSociaux = fonciers * 0.172 + psDividendesPFU + psPVPFU;
    const totalImpots = irRevenu + prelSociaux;
    const revenuTotal = salaires + fonciers + dividendes + plusValues + autres;
    const tauxMoyen = revenuTotal > 0 ? (totalImpots / revenuTotal) * 100 : 0;
    const tmiEffectif = [...BAREME_IR_2026].reverse().find((t: { min: number; taux: number }) => rniParPart > t.min)?.taux ?? 0;

    // Comparatif PFU vs barème
    const irPFU = calcBareme((salairesNets + fonciers + autres - charges) / nbParts) * nbParts +
      dividendes * 0.128 + plusValues * 0.128;
    const irBareme = calcBareme((salairesNets + fonciers + dividendes * 0.6 + plusValues + autres - charges) / nbParts) * nbParts;
    const psPFU = fonciers * 0.172 + dividendes * 0.172 + plusValues * 0.172;
    const psBareme = fonciers * 0.172 + dividendes * 0.172 + plusValues * 0.172;
    const totalPFU = irPFU + psPFU;
    const totalBareme = irBareme + psBareme;

    return {
      rni, irRevenu, prelSociaux, totalImpots, tauxMoyen, tmiEffectif,
      salairesNets, dividendesBareme, pvBareme, totalPFU, totalBareme, irBareme,
      revenuTotal,
    };
  }, [situation, enfants, salaires, fonciers, dividendes, plusValues, autres, charges, optionBareme]);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: ['Salaires nets', 'Rev. fonciers', 'Dividendes', 'Autres', 'Impôt revenu', 'Prél. sociaux'],
        datasets: [{
          data: [calc.salairesNets, fonciers, dividendes, autres, calc.irRevenu, calc.prelSociaux],
          backgroundColor: [
            'rgba(0,32,96,0.7)', 'rgba(0,32,96,0.5)', 'rgba(0,32,96,0.35)',
            'rgba(0,32,96,0.2)', 'rgba(192,57,43,0.7)', 'rgba(217,119,6,0.7)',
          ],
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { ticks: { callback: (v) => fmtE(Number(v)) } } },
      },
    });
    return () => { chartRef.current?.destroy(); };
  }, [calc.salairesNets, fonciers, dividendes, autres, calc.irRevenu, calc.prelSociaux]);

  return (
    <div className="sim-layout">
      <div className="sim-inputs" style={{ width: 360 }}>
        <div className="card card--padded" style={{ marginBottom: 12 }}>
          <div className="card-title" style={{ marginBottom: 12, fontSize: 13 }}>👨‍👩‍👧 Foyer fiscal</div>
          <div className="sim-field">
            <label>Situation</label>
            <select value={situation} onChange={(e) => setSituation(e.target.value as 'celibataire' | 'marie')}>
              <option value="celibataire">Célibataire / Divorcé / Veuf</option>
              <option value="marie">Marié / Pacsé</option>
            </select>
          </div>
          <div className="sim-field">
            <label>Enfants à charge</label>
            <input type="number" value={enfants} min={0} max={10} onChange={(e) => setEnfants(Number(e.target.value))} />
          </div>
        </div>

        <div className="card card--padded" style={{ marginBottom: 12 }}>
          <div className="card-title" style={{ marginBottom: 12, fontSize: 13 }}>💼 Revenus</div>
          <div className="sim-field">
            <label>Salaires bruts (€)</label>
            <input type="number" value={salaires} min={0} onChange={(e) => setSalaires(Number(e.target.value))} />
          </div>
          <div className="sim-field">
            <label>Revenus fonciers nets (€)</label>
            <input type="number" value={fonciers} min={0} onChange={(e) => setFonciers(Number(e.target.value))} />
          </div>
          <div className="sim-field">
            <label>Dividendes bruts (€)</label>
            <input type="number" value={dividendes} min={0} onChange={(e) => setDividendes(Number(e.target.value))} />
          </div>
          <div className="sim-field">
            <label>Plus-values mobilières (€)</label>
            <input type="number" value={plusValues} min={0} onChange={(e) => setPlusValues(Number(e.target.value))} />
          </div>
          <div className="sim-field">
            <label>Autres revenus (€)</label>
            <input type="number" value={autres} min={0} onChange={(e) => setAutres(Number(e.target.value))} />
          </div>
        </div>

        <div className="card card--padded">
          <div className="card-title" style={{ marginBottom: 12, fontSize: 13 }}>⚙️ Déductions & Options</div>
          <div className="sim-field">
            <label>Charges déductibles (€)</label>
            <input type="number" value={charges} min={0} onChange={(e) => setCharges(Number(e.target.value))} />
          </div>
          <div className="sim-field">
            <label>Option pour dividendes / PV</label>
            <select value={optionBareme ? 'bareme' : 'pfu'} onChange={(e) => setOptionBareme(e.target.value === 'bareme')}>
              <option value="pfu">PFU — Flat tax 30% (12,8% IR + 17,2% PS)</option>
              <option value="bareme">Barème progressif</option>
            </select>
          </div>
        </div>
      </div>

      <div className="sim-results">
        <div className="sim-stats-grid" style={{ marginBottom: 16 }}>
          <div className="stat-card">
            <div className="stat-label">Revenu net imposable</div>
            <div className="stat-val" style={{ fontSize: 18 }}>{fmtE(calc.rni)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Impôt sur le revenu</div>
            <div className="stat-val" style={{ fontSize: 18, color: 'var(--red)' }}>{fmtE(calc.irRevenu)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Prélèvements sociaux</div>
            <div className="stat-val" style={{ fontSize: 18, color: 'var(--orange)' }}>{fmtE(calc.prelSociaux)}</div>
          </div>
          <div className="stat-card" style={{ borderColor: 'var(--red)' }}>
            <div className="stat-label">Total impôts</div>
            <div className="stat-val" style={{ fontSize: 22, color: 'var(--red)' }}>{fmtE(calc.totalImpots)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Taux moyen</div>
            <div className="stat-val" style={{ fontSize: 22 }}>{fmtP(calc.tauxMoyen)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">TMI</div>
            <div className="stat-val" style={{ fontSize: 22, color: 'var(--bronze)' }}>{fmtP(calc.tmiEffectif * 100, 0)}</div>
          </div>
        </div>

        <div className="sim-comparatif" style={{ marginBottom: 16 }}>
          <div className="sim-comparatif-title">Comparatif PFU vs Barème (dividendes + PV)</div>
          <div className="loc-line"><span>Impôt — PFU (flat tax)</span><span>{fmtE(calc.totalPFU)}</span></div>
          <div className="loc-line"><span>Impôt — Barème progressif</span><span>{fmtE(calc.totalBareme)}</span></div>
          <div className="loc-line total">
            <span>Option la plus avantageuse</span>
            <span style={{ color: calc.totalPFU <= calc.totalBareme ? 'var(--green)' : 'var(--bronze)' }}>
              {calc.totalPFU <= calc.totalBareme ? 'PFU' : 'Barème'}
            </span>
          </div>
        </div>

        <div className="card card--padded sim-chart-wrap" style={{ height: 200, padding: '16px 16px 8px' }}>
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  );
}
