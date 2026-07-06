import { useEffect, useMemo, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const fmt = (n: number, dec = 0) =>
  isNaN(n) || !isFinite(n) ? '—' : n.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtE = (n: number, dec = 0) => fmt(n, dec) + ' €';
const fmtP = (n: number, dec = 2) => fmt(n, dec) + ' %';

export default function RendementLocatifTab() {
  const [prixAchat, setPrixAchat] = useState(200000);
  const [fraisNotaire, setFraisNotaire] = useState(15000);
  const [travaux, setTravaux] = useState(10000);
  const [loyerHC, setLoyerHC] = useState(900);
  const [charges, setCharges] = useState(1200);
  const [taxeFonciere, setTaxeFonciere] = useState(1000);
  const [assurancePNO, setAssurancePNO] = useState(300);
  const [fraisGestion, setFraisGestion] = useState(800);
  const [vacance, setVacance] = useState(1);
  const [apport, setApport] = useState(50000);
  const [tauxCredit, setTauxCredit] = useState(3.5);
  const [dureeCredit, setDureeCredit] = useState(20);
  const [regime, setRegime] = useState<'micro' | 'reel' | 'lmnp'>('reel');
  const [tmi, setTmi] = useState(30);
  const chartRef = useRef<Chart | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const calc = useMemo(() => {
    const investTotal = prixAchat + fraisNotaire + travaux;
    const loyerAnnuel = loyerHC * (12 - vacance);
    const chargesAnnuelles = charges + taxeFonciere + assurancePNO + fraisGestion;
    const emprunt = investTotal - apport;
    const tm = tauxCredit / 100 / 12;
    const n = dureeCredit * 12;
    const mensualiteCredit = emprunt > 0 && tm > 0
      ? emprunt * tm * Math.pow(1 + tm, n) / (Math.pow(1 + tm, n) - 1)
      : 0;
    const annuiteCredit = mensualiteCredit * 12;
    const interetsAnnuels = emprunt * (tauxCredit / 100);

    const rendBrut = investTotal > 0 ? (loyerAnnuel / investTotal) * 100 : 0;
    const rendNet = investTotal > 0 ? ((loyerAnnuel - chargesAnnuelles) / investTotal) * 100 : 0;

    let baseImposable = 0;
    if (regime === 'micro') baseImposable = loyerAnnuel * 0.7;
    else if (regime === 'lmnp') baseImposable = loyerAnnuel * 0.5;
    else baseImposable = Math.max(0, loyerAnnuel - chargesAnnuelles - interetsAnnuels);

    const tmiRate = tmi / 100;
    const impot = baseImposable * (tmiRate + 0.172);
    const revenuNet = loyerAnnuel - chargesAnnuelles - impot - annuiteCredit;
    const rendNetNet = investTotal > 0 ? ((loyerAnnuel - chargesAnnuelles - impot) / investTotal) * 100 : 0;
    const cashflowMensuel = revenuNet / 12;

    return {
      investTotal, loyerAnnuel, chargesAnnuelles, mensualiteCredit, annuiteCredit,
      interetsAnnuels, rendBrut, rendNet, rendNetNet, cashflowMensuel, impot, baseImposable,
    };
  }, [prixAchat, fraisNotaire, travaux, loyerHC, charges, taxeFonciere, assurancePNO,
    fraisGestion, vacance, apport, tauxCredit, dureeCredit, regime, tmi]);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: ['Rendement brut', 'Rendement net charges', 'Rendement net-net'],
        datasets: [{
          data: [calc.rendBrut, calc.rendNet, calc.rendNetNet],
          backgroundColor: ['rgba(0,32,96,0.7)', 'rgba(190,132,92,0.7)', 'rgba(46,125,82,0.7)'],
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { ticks: { callback: (v) => fmtP(Number(v)) } } },
      },
    });
    return () => { chartRef.current?.destroy(); };
  }, [calc.rendBrut, calc.rendNet, calc.rendNetNet]);

  return (
    <div className="sim-layout">
      <div className="sim-inputs--wide">
        <div className="card card--padded" style={{ marginBottom: 12 }}>
          <div className="card-title" style={{ marginBottom: 12, fontSize: 13 }}>🏠 Acquisition</div>
          <div className="sim-field">
            <label>Prix d&apos;achat (€)</label>
            <input type="number" value={prixAchat} min={0} onChange={(e) => setPrixAchat(Number(e.target.value))} />
          </div>
          <div className="sim-field">
            <label>Frais de notaire (€)</label>
            <input type="number" value={fraisNotaire} min={0} onChange={(e) => setFraisNotaire(Number(e.target.value))} />
          </div>
          <div className="sim-field">
            <label>Travaux / Mobilier (€)</label>
            <input type="number" value={travaux} min={0} onChange={(e) => setTravaux(Number(e.target.value))} />
          </div>
        </div>

        <div className="card card--padded" style={{ marginBottom: 12 }}>
          <div className="card-title" style={{ marginBottom: 12, fontSize: 13 }}>💰 Revenus & Charges</div>
          <div className="sim-field">
            <label>Loyer mensuel HC (€)</label>
            <input type="number" value={loyerHC} min={0} onChange={(e) => setLoyerHC(Number(e.target.value))} />
          </div>
          <div className="sim-field">
            <label>Charges copro/an (€)</label>
            <input type="number" value={charges} min={0} onChange={(e) => setCharges(Number(e.target.value))} />
          </div>
          <div className="sim-field">
            <label>Taxe foncière/an (€)</label>
            <input type="number" value={taxeFonciere} min={0} onChange={(e) => setTaxeFonciere(Number(e.target.value))} />
          </div>
          <div className="sim-field">
            <label>Assurance PNO/an (€)</label>
            <input type="number" value={assurancePNO} min={0} onChange={(e) => setAssurancePNO(Number(e.target.value))} />
          </div>
          <div className="sim-field">
            <label>Frais de gestion/an (€)</label>
            <input type="number" value={fraisGestion} min={0} onChange={(e) => setFraisGestion(Number(e.target.value))} />
          </div>
          <div className="sim-field">
            <label>Vacance locative (mois/an)</label>
            <input type="number" value={vacance} min={0} max={12} onChange={(e) => setVacance(Number(e.target.value))} />
          </div>
        </div>

        <div className="card card--padded">
          <div className="card-title" style={{ marginBottom: 12, fontSize: 13 }}>🏦 Financement & Fiscalité</div>
          <div className="sim-field">
            <label>Apport (€)</label>
            <input type="number" value={apport} min={0} onChange={(e) => setApport(Number(e.target.value))} />
          </div>
          <div className="sim-field">
            <label>Taux crédit (%)</label>
            <input type="number" value={tauxCredit} step={0.1} min={0} onChange={(e) => setTauxCredit(Number(e.target.value))} />
          </div>
          <div className="sim-field">
            <label>Durée crédit (ans)</label>
            <input type="number" value={dureeCredit} min={1} max={30} onChange={(e) => setDureeCredit(Number(e.target.value))} />
          </div>
          <div className="sim-field">
            <label>Régime fiscal</label>
            <select value={regime} onChange={(e) => setRegime(e.target.value as 'micro' | 'reel' | 'lmnp')}>
              <option value="micro">Micro-foncier (abatt. 30%)</option>
              <option value="reel">Réel</option>
              <option value="lmnp">LMNP (abatt. 50%)</option>
            </select>
          </div>
          <div className="sim-field">
            <label>TMI (%)</label>
            <select value={tmi} onChange={(e) => setTmi(Number(e.target.value))}>
              <option value={11}>11%</option>
              <option value={30}>30%</option>
              <option value={41}>41%</option>
              <option value={45}>45%</option>
            </select>
          </div>
        </div>
      </div>

      <div className="sim-results">
        <div className="sim-stats-grid sim-stats-grid--4" style={{ marginBottom: 16 }}>
          <div className="stat-card">
            <div className="stat-label">Rendement brut</div>
            <div className="stat-val" style={{ fontSize: 22, color: 'var(--navy)' }}>{fmtP(calc.rendBrut)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Rendement net charges</div>
            <div className="stat-val" style={{ fontSize: 22, color: 'var(--bronze)' }}>{fmtP(calc.rendNet)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Rendement net-net</div>
            <div className="stat-val" style={{ fontSize: 22, color: 'var(--green)' }}>{fmtP(calc.rendNetNet)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Cash-flow mensuel</div>
            <div className="stat-val" style={{ fontSize: 22, color: calc.cashflowMensuel >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {fmtE(calc.cashflowMensuel, 0)}
            </div>
          </div>
        </div>

        <div className="card card--padded" style={{ marginBottom: 16 }}>
          <div className="card-title" style={{ marginBottom: 12, fontSize: 13 }}>Compte d&apos;exploitation annuel</div>
          <div className="loc-line pos"><span>Loyer annuel encaissé</span><span>{fmtE(calc.loyerAnnuel)}</span></div>
          <div className="loc-line neg"><span>Charges annuelles</span><span>- {fmtE(calc.chargesAnnuelles)}</span></div>
          <div className="loc-line neg"><span>Annuité crédit</span><span>- {fmtE(calc.annuiteCredit)}</span></div>
          <div className="loc-line neg"><span>Impôt + prél. sociaux</span><span>- {fmtE(calc.impot)}</span></div>
          <div className="loc-line total"><span>Cash-flow net annuel</span><span>{fmtE(calc.cashflowMensuel * 12)}</span></div>
        </div>

        <div className="card card--padded sim-chart-wrap" style={{ height: 200, padding: '16px 16px 8px' }}>
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  );
}
