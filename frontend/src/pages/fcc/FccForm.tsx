import { useEffect, useRef, useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useSearchParams } from 'react-router-dom';
import './fcc.css';
import {
  OBJECTIVES, PRODUCTS, INFO_MODES, AFFIRMATIONS, GESTION_OPTIONS, RISK_DATA,
  getConnProfile, getRiskProfile,
  type ObjectiveRow, type BenefRow, type ProductState, type InfoState, type AffState,
} from './fccData';

const TOTAL_SECTIONS = 6;

// ─── PP Section 1 state ─────────────────────────────────────────────────────
interface PpFields {
  civility: string;
  nom: string; prenom: string;
  adresse: string; cp: string; ville: string;
  telMobile: string; telMaison: string; telBureau: string;
  email: string; ddn: string; nationalite: string;
  situation: string; regime: string;
  profession: string; statut: string; secteur: string; societe: string;
  revenus: string; charges: string;
  patImmo: string; patEpargne: string; patPartici: string; patLiqui: string; patAutres: string;
}

// ─── PM Section 1 state ─────────────────────────────────────────────────────
interface PmFields {
  denomination: string; formeJuridique: string; siren: string; naf: string;
  email: string; adresse: string; cp: string; ville: string; tel: string;
  repNom: string; repPrenom: string; repFonction: string;
  benef: BenefRow[];
  revenus: string; charges: string;
  patImmo: string; patEpargne: string; patPartici: string; patLiqui: string; patAutres: string;
}

interface FccFormProps { type: 'PP' | 'PM' }

interface TenantBranding { name: string; orias: string; email: string }

export default function FccForm({ type }: FccFormProps) {
  const [searchParams] = useSearchParams();
  const [section, setSection] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [tenant, setTenant] = useState<TenantBranding>({ name: '', orias: '', email: '' });
  const [parsed, setParsed] = useState(false);

  // PP fields
  const [pp, setPp] = useState<PpFields>({
    civility: '', nom: '', prenom: '', adresse: '', cp: '', ville: '',
    telMobile: '', telMaison: '', telBureau: '', email: '', ddn: '', nationalite: '',
    situation: '', regime: '', profession: '', statut: '', secteur: '', societe: '',
    revenus: '', charges: '', patImmo: '', patEpargne: '', patPartici: '', patLiqui: '', patAutres: '',
  });

  // PM fields
  const [pm, setPm] = useState<PmFields>({
    denomination: '', formeJuridique: '', siren: '', naf: '',
    email: '', adresse: '', cp: '', ville: '', tel: '',
    repNom: '', repPrenom: '', repFonction: '',
    benef: [
      { nom: '', prenom: '', ddn: '', pct: '' },
      { nom: '', prenom: '', ddn: '', pct: '' },
      { nom: '', prenom: '', ddn: '', pct: '' },
      { nom: '', prenom: '', ddn: '', pct: '' },
    ],
    revenus: '', charges: '', patImmo: '', patEpargne: '', patPartici: '', patLiqui: '', patAutres: '',
  });

  // Section 2 — objectives
  const [objectives, setObjectives] = useState<ObjectiveRow[]>(
    OBJECTIVES.map(() => ({ prio: '', ech: '', comment: '' })),
  );

  // Section 3 — knowledge
  const [products, setProducts] = useState<ProductState[]>(
    PRODUCTS.map(() => ({ investi: false, conn: '' })),
  );
  const [gestion, setGestion] = useState<number | null>(null);
  const [info, setInfo] = useState<InfoState[]>(INFO_MODES.map(() => ''));
  const [affirmations, setAffirmations] = useState<AffState[]>(AFFIRMATIONS.map(() => ''));

  // Section 4 — risk
  const [risk, setRisk] = useState<Record<string, number | null>>({
    risk_patri: null, risk_produit: null, risk_reaction: null,
    risk_pertes: null, risk_crises: null, risk_liqui: null,
    risk_appetence: null, risk_horizon: null, risk_global: null,
  });

  // Section 5 — ESG
  const [esg, setEsg] = useState({
    q1: '', q2: '', q3: '', q4: '', q5: '', q6: '', comment: '',
  });

  // Section 6
  const [lieu, setLieu] = useState('');
  const [dateSig, setDateSig] = useState('');

  // Metadata
  const formIdRef = useRef('FCC-' + type + '-' + Date.now().toString(36).toUpperCase());
  const timestampRef = useRef(new Date().toISOString());
  const sigDataRef = useRef<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recordIdRef = useRef<string>('');
  const tenantIdRef = useRef<string>('');
  const prefillTokenRef = useRef<string>('');

  // ── Prefill from URL ──────────────────────────────────────────────────────
  useEffect(() => {
    const raw = searchParams.get('data');
    if (!raw) { setParsed(true); return; }
    try {
      const d = JSON.parse(decodeURIComponent(escape(atob(raw))));
      if (type === 'PP') {
        setPp(prev => ({
          ...prev,
          civility: d.civilite || '',
          nom: d.nom || '',
          prenom: d.prenom || '',
          adresse: d.adresse || '',
          cp: d.cp || '',
          ville: d.ville || '',
          telMobile: d.tel_mobile || '',
          email: d.email || '',
          ddn: d.ddn || '',
          nationalite: d.nationalite || '',
          situation: d.situation || '',
          regime: d.regime || '',
          profession: d.profession || '',
          statut: d.statut || '',
          secteur: d.secteur || '',
          societe: d.societe || '',
          revenus: d.revenus ? String(d.revenus) : '',
          charges: d.charges ? String(d.charges) : '',
          patImmo: d.pat_immo || '',
          patEpargne: d.pat_epargne || '',
          patPartici: d.pat_partici || '',
          patLiqui: d.pat_liqui || '',
          patAutres: d.pat_autres || '',
        }));
      } else {
        setPm(prev => ({
          ...prev,
          denomination: d.denomination || '',
          siren: d.siren || '',
          naf: d.naf || '',
          email: d.email || '',
          adresse: d.adresse || '',
          cp: d.cp || '',
          ville: d.ville || '',
          tel: d.tel || '',
          repNom: d.representant || '',
          repFonction: d.fonction || '',
        }));
      }
      if (d._tenant_name) {
        setTenant({ name: d._tenant_name, orias: d._tenant_orias || '', email: d._tenant_email || '' });
      }
      if (d._record_id) recordIdRef.current = String(d._record_id);
      if (d._tenant_id) tenantIdRef.current = String(d._tenant_id);
      if (d._prefill_token) prefillTokenRef.current = String(d._prefill_token);
      setPrefilled(true);
    } catch { /* ignore decode errors */ }
    setParsed(true);
  }, [searchParams, type]);

  // ── Signature timestamp ───────────────────────────────────────────────────
  useEffect(() => {
    setDateSig(new Date().toLocaleString('fr-FR'));
    const interval = setInterval(() => setDateSig(new Date().toLocaleString('fr-FR')), 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Canvas signature ──────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#1E3A5F';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    let drawing = false;

    const getPos = (e: MouseEvent | TouchEvent) => {
      const r = canvas.getBoundingClientRect();
      const src = 'touches' in e ? e.touches[0] : e;
      return { x: src.clientX - r.left, y: src.clientY - r.top };
    };

    const onDown = (e: MouseEvent) => { drawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
    const onMove = (e: MouseEvent) => { if (!drawing) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
    const onUp = () => { drawing = false; sigDataRef.current = canvas.toDataURL(); };
    const onTouchStart = (e: TouchEvent) => { e.preventDefault(); drawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
    const onTouchMove = (e: TouchEvent) => { e.preventDefault(); if (!drawing) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
    const onTouchEnd = () => { drawing = false; sigDataRef.current = canvas.toDataURL(); };

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
    return () => {
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [section]);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    sigDataRef.current = null;
  };

  // ── Scoring ───────────────────────────────────────────────────────────────
  const calcConnScore = useCallback(() => {
    let s = 0;
    products.forEach((p) => {
      if (p.investi) s += 2;
      if (p.conn === 'peu') s += 4;
      else if (p.conn === 'bien') s += 6;
    });
    if (gestion !== null) s += gestion;
    info.forEach(v => { if (v === 'oui') s += 15; else if (v === 'peu') s += 10; else if (v === 'jamais') s += 5; });
    affirmations.forEach(v => { if (v === 'vrai') s += 10; else if (v === 'faux') s += 5; });
    return s;
  }, [products, gestion, info, affirmations]);

  const calcRiskScore = useCallback(() => {
    const keys = ['risk_patri', 'risk_produit', 'risk_reaction', 'risk_pertes', 'risk_crises', 'risk_liqui', 'risk_appetence', 'risk_horizon'];
    return keys.reduce((s, k) => s + (risk[k] || 0), 0);
  }, [risk]);

  const connScore = calcConnScore();
  const riskScore = calcRiskScore();
  const cp = getConnProfile(connScore);
  const rp = getRiskProfile(riskScore);

  // ── Navigation ────────────────────────────────────────────────────────────
  const goTo = (n: number) => {
    setSection(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── XLSX export ───────────────────────────────────────────────────────────
  const buildXlsx = useCallback((): string => {
    try {
      const wb = XLSX.utils.book_new();
      const clientName = type === 'PP'
        ? `${pp.civility} ${pp.prenom} ${pp.nom}`.trim()
        : pm.denomination;

      // Sheet 1 — identity
      const s1: (string | number)[][] = [
        ['FICHE CONNAISSANCE CLIENT — PERSONNE ' + type],
        ['ID Formulaire:', formIdRef.current, 'Horodatage:', timestampRef.current],
        [],
      ];
      if (type === 'PP') {
        s1.push(
          ['Civilité', pp.civility], ['Nom', pp.nom], ['Prénom', pp.prenom],
          ['E-mail', pp.email], ['Adresse', pp.adresse], ['CP', pp.cp], ['Ville', pp.ville],
          ['Tél.', pp.telMobile], ['Date naissance', pp.ddn], ['Nationalité', pp.nationalite],
          ['Situation matrimoniale', pp.situation], ['Régime', pp.regime],
          ['Profession', pp.profession], ['Statut', pp.statut],
          ['Revenus annuels (K€)', pp.revenus], ['Charges (K€)', pp.charges],
          [], ['PATRIMOINE'],
          ['Immobilier', pp.patImmo], ['Épargne LT', pp.patEpargne],
          ['Participations', pp.patPartici], ['Liquidités', pp.patLiqui], ['Autres', pp.patAutres],
        );
      } else {
        s1.push(
          ['Dénomination', pm.denomination], ['Forme juridique', pm.formeJuridique],
          ['SIREN', pm.siren], ['NAF', pm.naf], ['E-mail', pm.email],
          ['Adresse', pm.adresse], ['CP', pm.cp], ['Ville', pm.ville], ['Tél.', pm.tel],
          ['Représentant légal', `${pm.repPrenom} ${pm.repNom}`.trim()],
          ['Fonction', pm.repFonction],
          ['CA annuel (K€)', pm.revenus], ['Charges (K€)', pm.charges],
          [], ['PATRIMOINE'],
          ['Immobilier', pm.patImmo], ['Épargne LT', pm.patEpargne],
          ['Participations', pm.patPartici], ['Liquidités', pm.patLiqui], ['Autres', pm.patAutres],
        );
      }
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s1), 'Informations');

      // Sheet 2 — objectives
      const s2: (string | number)[][] = [['OBJECTIFS'], ['Objectif', 'Priorité', 'Échéance', 'Commentaires']];
      OBJECTIVES.forEach((obj, i) => {
        const o = objectives[i];
        if (o.prio || o.ech) s2.push([obj, o.prio, o.ech, o.comment]);
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s2), 'Objectifs');

      // Sheet 3 — knowledge
      const s3: (string | number)[][] = [['CONNAISSANCE'], ['Score:', connScore, 'Profil:', cp.label], [], ['Produit', 'Investi', 'Connaissance']];
      PRODUCTS.forEach((prod, i) => s3.push([prod, products[i].investi ? 'OUI' : 'NON', products[i].conn]));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s3), 'Connaissance');

      // Sheet 4 — risk
      const s4: (string | number)[][] = [['RISQUE'], ['Score:', riskScore, 'Profil:', rp.label], []];
      Object.keys(RISK_DATA).forEach(k => s4.push([k, risk[k] ?? '']));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s4), 'Risque');

      // Sheet 5 — ESG
      const s5: (string | number)[][] = [['DURABILITÉ'], ['Question', 'Réponse'],
        ['1/', esg.q1], ['2/', esg.q2], ['3/', esg.q3],
        ['4/', esg.q4], ['5/', esg.q5], ['6/', esg.q6],
        ['Commentaires', esg.comment]];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s5), 'Durabilité');

      // Sheet 6 — summary
      const s6: (string | number)[][] = [
        ['SYNTHÈSE'], [], ['Client', clientName],
        ['Date signature', dateSig], ['Lieu', lieu], [],
        ['', 'Score', 'Profil'],
        ['Connaissance', connScore, cp.label],
        ['Risque', riskScore, rp.label],
        ['Total', connScore + riskScore], [],
        ['ID', formIdRef.current], ['Horodatage', timestampRef.current],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s6), 'Scores');

      return XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
    } catch { return ''; }
  }, [type, pp, pm, objectives, products, gestion, info, affirmations, risk, esg, lieu, dateSig, connScore, riskScore, cp, rp]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const nomField = type === 'PP' ? pp.nom : pm.denomination;
    const emailField = type === 'PP' ? pp.email : pm.email;
    if (!nomField.trim()) { alert('Veuillez renseigner le nom avant de soumettre.'); return; }
    if (!emailField.trim()) { alert('Veuillez renseigner l\'adresse e-mail avant de soumettre.'); return; }
    if (!sigDataRef.current) {
      if (!confirm('Aucune signature détectée. Confirmer la soumission quand même ?')) return;
    }

    setSubmitting(true);

    const objResume = objectives
      .map((o, i) => o.prio || o.ech ? `${OBJECTIVES[i]} (priorité:${o.prio || '-'} échéance:${o.ech || '-'}ans)` : null)
      .filter(Boolean).join(' | ');

    const prodResume = products
      .map((p, i) => p.investi || p.conn ? `${PRODUCTS[i]}: ${p.investi ? 'investi ' : ''}${p.conn}` : null)
      .filter(Boolean).join(' | ');

    const payload: Record<string, unknown> = {
      form_id: formIdRef.current,
      form_type: type,
      record_id: recordIdRef.current || undefined,
      tenant_id: tenantIdRef.current || undefined,
      prefill_token: prefillTokenRef.current || undefined,
      timestamp_soumission: new Date().toISOString(),
      objectifs_resume: objResume,
      score_connaissance: connScore,
      profil_connaissance: cp.label,
      score_risque: riskScore,
      profil_risque: rp.label,
      score_total: connScore + riskScore,
      produits_resume: prodResume,
      risk_patri: risk.risk_patri || 0,
      risk_produit: risk.risk_produit || 0,
      risk_reaction: risk.risk_reaction || 0,
      risk_pertes: risk.risk_pertes || 0,
      risk_crises: risk.risk_crises || 0,
      risk_liqui: risk.risk_liqui || 0,
      risk_appetence: risk.risk_appetence || 0,
      risk_horizon: risk.risk_horizon || 0,
      esg_q1: esg.q1, esg_q2: esg.q2, esg_q3: esg.q3,
      esg_q4: esg.q4, esg_q5: esg.q5, esg_q6: esg.q6,
      esg_commentaires: esg.comment,
      signature_date: dateSig,
      signature_lieu: lieu,
      signature_data: sigDataRef.current || '',
      xlsx_base64: buildXlsx(),
    };

    if (type === 'PP') {
      Object.assign(payload, {
        client_civilite: pp.civility, client_nom: pp.nom, client_prenom: pp.prenom,
        // Name sent to Make must be "<Prénom> <Nom>" — civility travels separately
        // in client_civilite, never prefixed onto the name.
        client_nom_complet: `${pp.prenom} ${pp.nom}`.trim(),
        client_email: pp.email, client_adresse: pp.adresse, client_cp: pp.cp, client_ville: pp.ville,
        client_tel: pp.telMobile, client_ddn: pp.ddn, client_nationalite: pp.nationalite,
        client_situation: pp.situation, client_regime: pp.regime,
        client_profession: pp.profession, client_statut: pp.statut,
        client_secteur: pp.secteur, client_societe: pp.societe,
        revenus_keur: pp.revenus, charges_keur: pp.charges,
        pat_immobilier: pp.patImmo, pat_epargne: pp.patEpargne,
        pat_participations: pp.patPartici, pat_liquidites: pp.patLiqui, pat_autres: pp.patAutres,
      });
    } else {
      Object.assign(payload, {
        client_denomination: pm.denomination, client_forme_juridique: pm.formeJuridique,
        client_siren: pm.siren, client_naf: pm.naf, client_email: pm.email,
        client_adresse: pm.adresse, client_cp: pm.cp, client_ville: pm.ville, client_tel: pm.tel,
        client_rep_nom: pm.repNom, client_rep_prenom: pm.repPrenom, client_rep_fonction: pm.repFonction,
        benef_1: pm.benef[0] ? `${pm.benef[0].prenom} ${pm.benef[0].nom} ${pm.benef[0].ddn} ${pm.benef[0].pct}%`.trim() : '',
        benef_2: pm.benef[1] ? `${pm.benef[1].prenom} ${pm.benef[1].nom} ${pm.benef[1].ddn} ${pm.benef[1].pct}%`.trim() : '',
        benef_3: pm.benef[2] ? `${pm.benef[2].prenom} ${pm.benef[2].nom} ${pm.benef[2].ddn} ${pm.benef[2].pct}%`.trim() : '',
        benef_4: pm.benef[3] ? `${pm.benef[3].prenom} ${pm.benef[3].nom} ${pm.benef[3].ddn} ${pm.benef[3].pct}%`.trim() : '',
        revenus_keur: pm.revenus, charges_keur: pm.charges,
        pat_immobilier: pm.patImmo, pat_epargne: pm.patEpargne,
        pat_participations: pm.patPartici, pat_liquidites: pm.patLiqui, pat_autres: pm.patAutres,
      });
    }

    try {
      await fetch('/api/fcc/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch { /* best-effort */ }

    setSubmitting(false);
    setSubmitted(true);
  };

  // ── Render helpers ────────────────────────────────────────────────────────
  if (!parsed) return null;
  if (!tenant.name) {
    return (
      <div className="fcc-root" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="fcc-section-card" style={{ maxWidth: 480, textAlign: 'center', padding: '2.5rem 2rem' }}>
          <div style={{ fontSize: 48, marginBottom: '1rem' }}>🔗</div>
          <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--fcc-navy)', marginBottom: '0.75rem' }}>Lien invalide</div>
          <div style={{ color: '#555', fontSize: 15 }}>
            Ce formulaire n'est accessible que via un lien transmis par votre conseiller.<br />
            Veuillez contacter votre conseiller pour obtenir un lien valide.
          </div>
        </div>
      </div>
    );
  }

  const progressPct = (section / TOTAL_SECTIONS) * 100;

  if (submitted) {
    return (
      <div className="fcc-root">
        <FccHeader type={type} tenant={tenant} />
        <div className="fcc-container">
          <div className="fcc-section-card">
            <div className="fcc-section-body fcc-success">
              <div className="fcc-success-icon">✅</div>
              <div className="fcc-success-title">Formulaire transmis avec succès</div>
              <div className="fcc-success-info">
                <strong style={{ color: 'var(--fcc-navy2)' }}>Prochaines étapes :</strong><br />
                1. {tenant.name} a bien reçu votre questionnaire de connaissance client<br />
                2. Votre conseiller va vérifier sa bonne complétude<br />
                3. Ce questionnaire complété vous sera envoyé pour signature électronique<br /><br />
                <strong>Délai habituel :</strong> 24 à 48 heures ouvrées
              </div>
            </div>
          </div>
        </div>
        <FccFooter tenant={tenant} />
      </div>
    );
  }

  return (
    <div className="fcc-root">
      <FccHeader type={type} tenant={tenant} />

      {/* Progress */}
      <div className="fcc-progress-wrap">
        <span className="fcc-progress-label">Section {section} / {TOTAL_SECTIONS}</span>
        <div className="fcc-progress-bar">
          <div className="fcc-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="fcc-progress-steps">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className={`fcc-step-dot${n === section ? ' active' : n < section ? ' done' : ''}`}>
              {n < 6 ? n : '✓'}
            </div>
          ))}
        </div>
      </div>

      {/* Score tracker (sections 3-5) */}
      {section >= 3 && section <= 5 && (
        <div className="fcc-score-tracker">
          <div className="fcc-score-tracker-title">Scoring</div>
          <div className="fcc-score-item"><span className="fcc-score-item-label">Connaissance</span><span className="fcc-score-item-val">{connScore}</span></div>
          <div className="fcc-score-item"><span className="fcc-score-item-label">Risque</span><span className="fcc-score-item-val">{riskScore}</span></div>
          <hr className="fcc-score-divider" />
          <div className="fcc-score-tracker-title">Total</div>
          <div className="fcc-score-total-val">{connScore + riskScore}</div>
          <div className="fcc-score-profile">{rp.label || '—'}</div>
        </div>
      )}

      {prefilled && (
        <div className="fcc-prefill-banner">
          <span style={{ fontSize: 18 }}>📋</span>
          <div>
            <strong>Formulaire prérempli par {tenant.name}</strong><br />
            <span style={{ fontSize: 12, opacity: 0.85 }}>Vos informations ont été pré-saisies par votre conseiller. Veuillez vérifier leur exactitude puis compléter les sections suivantes.</span>
          </div>
        </div>
      )}

      <div className="fcc-container">

        {/* ── Section 1 ─────────────────────────────────────────────────── */}
        {section === 1 && (
          <div className="fcc-section-card">
            <div className="fcc-section-header">
              <span className="fcc-section-badge">Section 1</span>
              <span className="fcc-section-title">Informations & Patrimoine</span>
              <span className="fcc-section-desc">{type === 'PP' ? 'Identité · Situation familiale · Patrimoine' : 'Société · Représentant · Bénéficiaires'}</span>
            </div>
            <div className="fcc-section-body">
              {type === 'PP' ? (
                <Section1PP pp={pp} setPp={setPp} />
              ) : (
                <Section1PM pm={pm} setPm={setPm} />
              )}
              <div className="fcc-nav-wrap">
                <div />
                <button className="fcc-btn fcc-btn-primary" onClick={() => goTo(2)}>Suivant →</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Section 2: Objectives ──────────────────────────────────────── */}
        {section === 2 && (
          <div className="fcc-section-card">
            <div className="fcc-section-header">
              <span className="fcc-section-badge">Section 2</span>
              <span className="fcc-section-title">Objectifs d'investissement</span>
              <span className="fcc-section-desc">Prioriser vos objectifs dans le temps</span>
            </div>
            <div className="fcc-section-body">
              <div className="fcc-intro-banner">
                Indiquez vos objectifs d'investissement en précisant leur <strong>priorité</strong> (1 = haute, 2 = moyenne, 3 = faible) et leur <strong>échéance en années</strong> (1 à 20). Laissez vide les objectifs non concernés.
              </div>
              <table className="fcc-obj-table">
                <thead>
                  <tr>
                    <th style={{ width: '55%' }}>Objectif</th>
                    <th style={{ width: '15%', textAlign: 'center' }}>Priorité<br /><small style={{ fontWeight: 400, fontSize: 10 }}>1 = haute · 3 = faible</small></th>
                    <th style={{ width: '15%', textAlign: 'center' }}>Échéance (années)</th>
                    <th style={{ width: '15%' }}>Commentaires</th>
                  </tr>
                </thead>
                <tbody>
                  {OBJECTIVES.map((obj, i) => (
                    <tr key={i}>
                      <td>{obj}</td>
                      <td><input type="number" min={1} max={3} placeholder="1–3" value={objectives[i].prio} onChange={e => setObjectives(prev => prev.map((o, j) => j === i ? { ...o, prio: e.target.value } : o))} style={{ width: 70, textAlign: 'center' }} /></td>
                      <td><input type="number" min={1} max={20} placeholder="1–20" value={objectives[i].ech} onChange={e => setObjectives(prev => prev.map((o, j) => j === i ? { ...o, ech: e.target.value } : o))} style={{ width: 70, textAlign: 'center' }} /></td>
                      <td><input type="text" placeholder="…" value={objectives[i].comment} onChange={e => setObjectives(prev => prev.map((o, j) => j === i ? { ...o, comment: e.target.value } : o))} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="fcc-nav-wrap">
                <button className="fcc-btn fcc-btn-secondary" onClick={() => goTo(1)}>← Précédent</button>
                <button className="fcc-btn fcc-btn-primary" onClick={() => goTo(3)}>Suivant →</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Section 3: Knowledge ──────────────────────────────────────── */}
        {section === 3 && (
          <div className="fcc-section-card">
            <div className="fcc-section-header">
              <span className="fcc-section-badge">Section 3</span>
              <span className="fcc-section-title">Connaissance & Expérience</span>
              <span className="fcc-section-desc">Scoring : 0–274 pts</span>
            </div>
            <div className="fcc-section-body">
              <div className="fcc-sub-section"><div className="fcc-sub-section-title">Produits déjà investis / connus</div></div>
              <div style={{ fontSize: 12, color: 'var(--fcc-muted)', marginBottom: 12 }}>Cochez les cases correspondant à votre situation (plusieurs choix possibles)</div>
              <table className="fcc-know-table">
                <thead>
                  <tr>
                    <th>Type de produit</th>
                    <th>J'ai déjà investi</th>
                    <th>Je connais<br />pas du tout</th>
                    <th>Je connais<br />un peu</th>
                    <th>Je connais<br />bien</th>
                  </tr>
                </thead>
                <tbody>
                  {PRODUCTS.map((prod, i) => (
                    <tr key={i}>
                      <td>{prod}</td>
                      {(['investi', 'non', 'peu', 'bien'] as const).map(v => (
                        <td key={v}>
                          <div className="fcc-checkbox-cell">
                            <div
                              className={`fcc-custom-cb${v === 'investi' ? (products[i].investi ? ' checked' : '') : (products[i].conn === v ? ' checked' : '')}`}
                              onClick={() => {
                                setProducts(prev => prev.map((p, j) => {
                                  if (j !== i) return p;
                                  if (v === 'investi') return { ...p, investi: !p.investi };
                                  return { ...p, conn: p.conn === v ? '' : v };
                                }));
                              }}
                            />
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="fcc-sub-section" style={{ marginTop: 28 }}><div className="fcc-sub-section-title">Gestion passée de vos avoirs</div></div>
              <div style={{ fontSize: 12, color: 'var(--fcc-muted)', marginBottom: 12 }}>Une seule réponse possible</div>
              <div className="fcc-radio-group">
                {GESTION_OPTIONS.map((opt, i) => (
                  <div key={i} className={`fcc-radio-option${gestion === opt.score ? ' selected' : ''}`} onClick={() => setGestion(gestion === opt.score ? null : opt.score)}>
                    <div className="fcc-radio-dot" />
                    <span className="fcc-radio-option-label">{opt.label}</span>
                  </div>
                ))}
              </div>

              <div className="fcc-sub-section" style={{ marginTop: 28 }}><div className="fcc-sub-section-title">Votre information financière</div></div>
              <div style={{ fontSize: 12, color: 'var(--fcc-muted)', marginBottom: 12 }}>Comment vous informez-vous ? (plusieurs choix possibles)</div>
              <table className="fcc-know-table">
                <thead>
                  <tr>
                    <th>Mode d'information</th>
                    <th>Oui</th>
                    <th>Un peu moins souvent</th>
                    <th>Jamais</th>
                  </tr>
                </thead>
                <tbody>
                  {INFO_MODES.map((mode, i) => (
                    <tr key={i}>
                      <td>{mode}</td>
                      {(['oui', 'peu', 'jamais'] as const).map(v => (
                        <td key={v}>
                          <div className="fcc-checkbox-cell">
                            <div className={`fcc-custom-cb${info[i] === v ? ' checked' : ''}`} onClick={() => setInfo(prev => prev.map((x, j) => j === i ? (x === v ? '' : v) : x))} />
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="fcc-sub-section" style={{ marginTop: 28 }}><div className="fcc-sub-section-title">Quelques affirmations…</div></div>
              <div style={{ fontSize: 12, color: 'var(--fcc-muted)', marginBottom: 12 }}>Indiquez si ces affirmations vous semblent vraies ou fausses</div>
              <table className="fcc-know-table">
                <thead>
                  <tr><th>Affirmation</th><th>VRAI</th><th>FAUX</th></tr>
                </thead>
                <tbody>
                  {AFFIRMATIONS.map((aff, i) => (
                    <tr key={i}>
                      <td>{aff}</td>
                      {(['vrai', 'faux'] as const).map(v => (
                        <td key={v}>
                          <div className="fcc-checkbox-cell">
                            <div className={`fcc-custom-cb${affirmations[i] === v ? ' checked' : ''}`} onClick={() => setAffirmations(prev => prev.map((x, j) => j === i ? (x === v ? '' : v) : x))} />
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="fcc-sub-section" style={{ marginTop: 24 }}><div className="fcc-sub-section-title">Profil de connaissance</div></div>
              <div className="fcc-result-box">
                {connScore > 0 ? (
                  <>Score connaissance : <strong>{connScore} pts</strong>
                    <span className={`fcc-profile-badge ${cp.cls}`} style={{ marginLeft: 12, fontSize: 13, padding: '5px 12px' }}>{cp.label}</span>
                    <span style={{ fontSize: 12, color: 'var(--fcc-muted)', marginLeft: 8 }}>Plage : {cp.range}</span>
                  </>
                ) : 'Complétez les réponses ci-dessus pour voir votre profil.'}
              </div>

              <div className="fcc-nav-wrap">
                <button className="fcc-btn fcc-btn-secondary" onClick={() => goTo(2)}>← Précédent</button>
                <button className="fcc-btn fcc-btn-primary" onClick={() => goTo(4)}>Suivant →</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Section 4: Risk ────────────────────────────────────────────── */}
        {section === 4 && (
          <div className="fcc-section-card">
            <div className="fcc-section-header">
              <span className="fcc-section-badge">Section 4</span>
              <span className="fcc-section-title">Évaluation du Risque</span>
              <span className="fcc-section-desc">Scoring : 40–150 pts</span>
            </div>
            <div className="fcc-section-body">
              {Object.entries(RISK_DATA).map(([key, group]) => {
                const titles: Record<string, string> = {
                  risk_patri: "Fluctuation de la valeur de l'ENSEMBLE de mon patrimoine — quelle variation acceptez-vous sur l'ensemble ?",
                  risk_produit: 'Variation maximum sur UN produit représentant 5% du patrimoine',
                  risk_reaction: 'Réaction en cas de baisse significative du portefeuille',
                  risk_pertes: 'Pertes passées — comment avez-vous réagi ?',
                  risk_crises: 'Dernières crises financières — comment les avez-vous vécues ?',
                  risk_liqui: 'Besoin de liquidité dans votre patrimoine',
                  risk_appetence: 'Appétence au risque dans la vie quotidienne',
                  risk_horizon: 'Horizon de votre principal objectif',
                  risk_global: 'Risque sur le patrimoine dans sa globalité',
                };
                return (
                  <div key={key}>
                    {key === 'risk_patri' ? (
                      <div className="fcc-risk-scenario">
                        <div className="fcc-risk-scenario-title">{titles[key]}</div>
                        <RiskGroup groupKey={key} options={group.options} selected={risk[key]} onSelect={score => setRisk(prev => ({ ...prev, [key]: prev[key] === score ? null : score }))} />
                      </div>
                    ) : (
                      <>
                        <div className="fcc-sub-section" style={{ marginTop: key === 'risk_global' ? 24 : 24 }}>
                          <div className="fcc-sub-section-title">{titles[key]}</div>
                        </div>
                        {key === 'risk_global' && <div style={{ fontSize: 12, color: 'var(--fcc-muted)', marginBottom: 12 }}>Quel profil de risque décrit le mieux votre souhait ?</div>}
                        {key === 'risk_horizon' && <div style={{ fontSize: 12, color: 'var(--fcc-muted)', marginBottom: 8 }}>Calculé automatiquement à partir de la Section 2 — vous pouvez ajuster ici si besoin</div>}
                        <RiskGroup groupKey={key} options={group.options} selected={risk[key]} onSelect={score => setRisk(prev => ({ ...prev, [key]: prev[key] === score ? null : score }))} />
                      </>
                    )}
                  </div>
                );
              })}

              <div className="fcc-sub-section" style={{ marginTop: 24 }}><div className="fcc-sub-section-title">Résultat — Profil de risque</div></div>
              <div className="fcc-result-box">
                {riskScore > 0 ? (
                  <>Score risque : <strong>{riskScore} pts</strong>
                    <span className={`fcc-profile-badge ${rp.cls}`} style={{ marginLeft: 12, fontSize: 13, padding: '5px 12px' }}>{rp.label}</span>
                    <span style={{ fontSize: 12, color: 'var(--fcc-muted)', marginLeft: 8 }}>Plage : {rp.range}</span>
                  </>
                ) : 'Complétez les réponses ci-dessus pour voir votre profil de risque.'}
              </div>

              <div className="fcc-nav-wrap">
                <button className="fcc-btn fcc-btn-secondary" onClick={() => goTo(3)}>← Précédent</button>
                <button className="fcc-btn fcc-btn-primary" onClick={() => goTo(5)}>Suivant →</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Section 5: ESG ─────────────────────────────────────────────── */}
        {section === 5 && (
          <div className="fcc-section-card">
            <div className="fcc-section-header">
              <span className="fcc-section-badge">Section 5</span>
              <span className="fcc-section-title">Durabilité (ESG)</span>
              <span className="fcc-section-desc">Préférences environnementales & sociales</span>
            </div>
            <div className="fcc-section-body">
              <div className="fcc-intro-banner">
                Les <strong>questions environnementales</strong> portent sur la biodiversité, les émissions de gaz à effet de serre, les énergies renouvelables, etc. Les <strong>questions sociales</strong> concernent les droits de l'homme, les normes du travail, la santé. Les <strong>questions de gouvernance</strong> traitent de la structure des conseils, de la rémunération des dirigeants et de l'éthique des affaires.
              </div>

              <EsgToggle question="1/ Connaissez-vous l'expression « investissement durable » ?" value={esg.q1} onChange={v => setEsg(prev => ({ ...prev, q1: v }))} />
              <EsgToggle question="2/ Portez-vous de l'intérêt pour les investissements prenant en compte les questions environnementales et/ou sociales ?" value={esg.q2} onChange={v => setEsg(prev => ({ ...prev, q2: v }))} />

              {esg.q2 === 'oui' && (
                <>
                  <div className="fcc-form-group" style={{ marginTop: 16 }}>
                    <label className="fcc-form-label">3/ Dans quelle proportion souhaitez-vous intégrer des investissements incluant des critères extra-financiers environnementaux et/ou sociaux ?</label>
                    <EsgChips options={['≥0%', '≥15%', '≥30%', 'Pas de préférences']} value={esg.q3} multi={false} onChange={v => setEsg(prev => ({ ...prev, q3: v }))} />
                  </div>
                  <div className="fcc-form-group" style={{ marginTop: 16 }}>
                    <label className="fcc-form-label">4/ Dans quelle proportion souhaitez-vous investir spécifiquement sur la thématique <strong>environnementale</strong> ?</label>
                    <EsgChips options={['≥0%', '≥0,5%', '≥1%', 'Pas de préférences']} value={esg.q4} multi={false} onChange={v => setEsg(prev => ({ ...prev, q4: v }))} />
                  </div>
                </>
              )}

              <EsgToggle question="5/ Souhaitez-vous prendre en considération un ou plusieurs thèmes ESG dans vos investissements ?" value={esg.q5} onChange={v => setEsg(prev => ({ ...prev, q5: v }))} />

              {esg.q5 === 'oui' && (
                <div className="fcc-form-group" style={{ marginTop: 12 }}>
                  <label className="fcc-form-label">6/ Si oui, quels thèmes souhaitez-vous privilégier ?</label>
                  <EsgChips options={['Environnement', 'Social', 'Gouvernance']} value={esg.q6} multi onChange={v => setEsg(prev => ({ ...prev, q6: v }))} />
                </div>
              )}

              <div className="fcc-form-group" style={{ marginTop: 20 }}>
                <label className="fcc-form-label">Commentaires libres sur vos préférences ESG</label>
                <textarea className="fcc-form-textarea" placeholder="Besoins spécifiques en matière d'investissements durables…" value={esg.comment} onChange={e => setEsg(prev => ({ ...prev, comment: e.target.value }))} />
              </div>

              <div className="fcc-nav-wrap">
                <button className="fcc-btn fcc-btn-secondary" onClick={() => goTo(4)}>← Précédent</button>
                <button className="fcc-btn fcc-btn-primary" onClick={() => goTo(6)}>Suivant →</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Section 6: Summary & Signature ────────────────────────────── */}
        {section === 6 && (
          <div className="fcc-section-card">
            <div className="fcc-section-header">
              <span className="fcc-section-badge">Section 6</span>
              <span className="fcc-section-title">Récapitulatif & Signature</span>
              <span className="fcc-section-desc">Vérification et validation</span>
            </div>
            <div className="fcc-section-body">
              {/* Summary */}
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: 'var(--fcc-navy)', marginBottom: 20 }}>
                Récapitulatif — {type === 'PP' ? `${pp.civility} ${pp.prenom} ${pp.nom}`.trim() || 'Client' : pm.denomination || 'Société'}
              </div>
              <div className="fcc-summary-grid">
                <div className="fcc-summary-card">
                  <div className="fcc-summary-card-title">Score Connaissance</div>
                  <div className="fcc-summary-card-value">{connScore} <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--fcc-muted)' }}>/ 274</span></div>
                  <div className="fcc-summary-card-sub"><span className={`fcc-profile-badge ${cp.cls}`} style={{ fontSize: 12, padding: '3px 10px' }}>{cp.label}</span></div>
                </div>
                <div className="fcc-summary-card">
                  <div className="fcc-summary-card-title">Score Risque</div>
                  <div className="fcc-summary-card-value">{riskScore} <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--fcc-muted)' }}>/ 150</span></div>
                  <div className="fcc-summary-card-sub"><span className={`fcc-profile-badge ${rp.cls}`} style={{ fontSize: 12, padding: '3px 10px' }}>{rp.label}</span></div>
                </div>
                <div className="fcc-summary-card">
                  <div className="fcc-summary-card-title">Score Total</div>
                  <div className="fcc-summary-card-value">{connScore + riskScore}</div>
                  <div className="fcc-summary-card-sub">Profil combiné</div>
                </div>
                <div className="fcc-summary-card">
                  <div className="fcc-summary-card-title">Identité</div>
                  <div className="fcc-summary-card-value" style={{ fontSize: 15 }}>{type === 'PP' ? (`${pp.civility} ${pp.prenom} ${pp.nom}`.trim() || '—') : (pm.denomination || '—')}</div>
                  <div className="fcc-summary-card-sub">{type === 'PP' ? pp.email : pm.email}</div>
                </div>
              </div>

              {/* Signature */}
              <div className="fcc-sub-section" style={{ marginTop: 24 }}><div className="fcc-sub-section-title">Signature électronique</div></div>
              <div style={{ fontSize: 13, color: 'var(--fcc-muted)', marginBottom: 12 }}>
                Signez ci-dessous pour confirmer l'exactitude des informations fournies et votre consentement au traitement de vos données conformément au RGPD.
              </div>
              <div className="fcc-form-row">
                <div>
                  <div className="fcc-signature-wrap">
                    <div className="fcc-sig-header">
                      <span>Signature</span>
                      <button className="fcc-sig-clear" onClick={clearSignature}>Effacer</button>
                    </div>
                    <canvas ref={canvasRef} className="fcc-sig-canvas" width={380} height={150} />
                  </div>
                </div>
                <div>
                  <div className="fcc-form-group">
                    <label className="fcc-form-label">Date & Heure (auto)</label>
                    <input className="fcc-form-input" type="text" value={dateSig} readOnly />
                  </div>
                  <div className="fcc-form-group">
                    <label className="fcc-form-label">Lieu de signature</label>
                    <input className="fcc-form-input" type="text" placeholder="Paris" value={lieu} onChange={e => setLieu(e.target.value)} />
                  </div>
                  <div style={{ background: '#f0f4ff', borderRadius: 8, padding: 12, fontSize: 12, color: 'var(--fcc-navy2)', lineHeight: 1.6, marginTop: 8 }}>
                    En signant, je certifie l'exactitude des informations fournies. Je consens à leur traitement par {tenant.name} dans le cadre de la relation de conseil, conformément au RGPD.
                  </div>
                </div>
              </div>

              <div className="fcc-nav-wrap">
                <button className="fcc-btn fcc-btn-secondary" onClick={() => goTo(5)}>← Précédent</button>
                <button className="fcc-btn fcc-btn-primary" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? '⏳ Envoi en cours…' : '✓ Valider & Soumettre'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
      <FccFooter tenant={tenant} />
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function FccHeader({ type, tenant }: { type: 'PP' | 'PM'; tenant: TenantBranding }) {
  return (
    <div className="fcc-header">
      <div className="fcc-header-left">
        <div className="fcc-header-logo-wrap" style={{ fontWeight: 700, fontSize: 20, color: 'var(--fcc-navy)' }}>
          {tenant.name}
        </div>
        <div className="fcc-header-type">
          Fiche Connaissance Client<br />
          <strong>{type === 'PP' ? 'Personne Physique' : 'Personne Morale'}</strong>
        </div>
      </div>
      <div className="fcc-header-meta">
        {tenant.orias && <><strong>ORIAS N° {tenant.orias}</strong><br /></>}
        {tenant.email && tenant.email}
      </div>
    </div>
  );
}

function FccFooter({ tenant }: { tenant: TenantBranding }) {
  const displayName = tenant.name || '';
  return (
    <div className="fcc-footer">
      {displayName && <>{displayName}{tenant.orias ? ` — ORIAS ${tenant.orias}` : ''}<br /></>}
      {tenant.email && <>{tenant.email}<br /></>}
      Document confidentiel — Données protégées RGPD — Toute reproduction interdite
    </div>
  );
}

function RiskGroup({ groupKey, options, selected, onSelect }: {
  groupKey: string;
  options: { key?: string; label: string; score: number }[];
  selected: number | null;
  onSelect: (score: number) => void;
}) {
  return (
    <div className="fcc-radio-group">
      {options.map((opt, i) => (
        <div key={`${groupKey}-${i}`} className={`fcc-radio-option${selected === opt.score ? ' selected' : ''}`} onClick={() => onSelect(opt.score)}>
          <div className="fcc-radio-dot" />
          <span className="fcc-radio-option-label">{opt.label}</span>
        </div>
      ))}
    </div>
  );
}

function EsgToggle({ question, value, onChange }: { question: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="fcc-toggle-row">
      <div className="fcc-toggle-question" dangerouslySetInnerHTML={{ __html: question }} />
      <div className="fcc-toggle-btns">
        <button className={`fcc-toggle-btn${value === 'oui' ? ' sel-oui' : ''}`} onClick={() => onChange(value === 'oui' ? '' : 'oui')}>OUI</button>
        <button className={`fcc-toggle-btn${value === 'non' ? ' sel-non' : ''}`} onClick={() => onChange(value === 'non' ? '' : 'non')}>NON</button>
      </div>
    </div>
  );
}

function EsgChips({ options, value, multi, onChange }: { options: string[]; value: string; multi: boolean; onChange: (v: string) => void }) {
  const selected = multi ? value.split(', ').filter(Boolean) : [value];
  const toggle = (opt: string) => {
    if (multi) {
      const arr = value.split(', ').filter(Boolean);
      const idx = arr.indexOf(opt);
      onChange(idx >= 0 ? arr.filter((_, i) => i !== idx).join(', ') : [...arr, opt].join(', '));
    } else {
      onChange(value === opt ? '' : opt);
    }
  };
  return (
    <div className="fcc-esg-choice-row">
      {options.map(opt => (
        <div key={opt} className={`fcc-esg-chip${selected.includes(opt) ? ' selected' : ''}`} onClick={() => toggle(opt)}>{opt}</div>
      ))}
    </div>
  );
}

// ─── Section 1 PP ──────────────────────────────────────────────────────────
function Section1PP({ pp, setPp }: { pp: PpFields; setPp: React.Dispatch<React.SetStateAction<PpFields>> }) {
  const set = (field: keyof PpFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setPp(prev => ({ ...prev, [field]: e.target.value }));
  return (
    <>
      <div className="fcc-intro-banner">
        L'objectif de cette Fiche Connaissance Client est de recueillir des informations vous concernant pour nous permettre de vous recommander des produits ou des services adéquats et ainsi agir au mieux de vos intérêts. Vous êtes invités à nous fournir des informations exactes, complètes, précises et de les maintenir à jour.
      </div>

      <div className="fcc-sub-section"><div className="fcc-sub-section-title">A — Identité</div></div>

      <div className="fcc-form-group">
        <label className="fcc-form-label">Civilité</label>
        <div className="fcc-civility-group">
          <button className={`fcc-civility-btn${pp.civility === 'M.' ? ' selected' : ''}`} onClick={() => setPp(prev => ({ ...prev, civility: prev.civility === 'M.' ? '' : 'M.' }))}>Monsieur</button>
          <button className={`fcc-civility-btn${pp.civility === 'Mme' ? ' selected' : ''}`} onClick={() => setPp(prev => ({ ...prev, civility: prev.civility === 'Mme' ? '' : 'Mme' }))}>Madame</button>
        </div>
      </div>

      <div className="fcc-form-row">
        <div className="fcc-form-group"><label className="fcc-form-label">Nom <span className="fcc-required">*</span></label><input type="text" className="fcc-form-input" placeholder="Nom de famille" value={pp.nom} onChange={set('nom')} /></div>
        <div className="fcc-form-group"><label className="fcc-form-label">Prénom <span className="fcc-required">*</span></label><input type="text" className="fcc-form-input" placeholder="Prénom" value={pp.prenom} onChange={set('prenom')} /></div>
      </div>
      <div className="fcc-form-group"><label className="fcc-form-label">Adresse</label><input type="text" className="fcc-form-input" placeholder="Rue, numéro" value={pp.adresse} onChange={set('adresse')} /></div>
      <div className="fcc-form-row">
        <div className="fcc-form-group"><label className="fcc-form-label">Code Postal</label><input type="text" className="fcc-form-input" placeholder="75000" value={pp.cp} onChange={set('cp')} /></div>
        <div className="fcc-form-group"><label className="fcc-form-label">Ville</label><input type="text" className="fcc-form-input" placeholder="Paris" value={pp.ville} onChange={set('ville')} /></div>
      </div>
      <div className="fcc-form-row">
        <div className="fcc-form-group"><label className="fcc-form-label">Tél. Portable</label><input type="tel" className="fcc-form-input" placeholder="+33 6 00 00 00 00" value={pp.telMobile} onChange={set('telMobile')} /></div>
        <div className="fcc-form-group"><label className="fcc-form-label">Tél. Maison</label><input type="tel" className="fcc-form-input" placeholder="+33 1 00 00 00 00" value={pp.telMaison} onChange={set('telMaison')} /></div>
      </div>
      <div className="fcc-form-row">
        <div className="fcc-form-group"><label className="fcc-form-label">Tél. Bureau</label><input type="tel" className="fcc-form-input" placeholder="+33 1 00 00 00 00" value={pp.telBureau} onChange={set('telBureau')} /></div>
        <div className="fcc-form-group"><label className="fcc-form-label">Adresse e-mail <span className="fcc-required">*</span></label><input type="email" className="fcc-form-input" placeholder="prenom.nom@email.com" value={pp.email} onChange={set('email')} /></div>
      </div>
      <div className="fcc-form-row">
        <div className="fcc-form-group"><label className="fcc-form-label">Date de naissance</label><input type="date" className="fcc-form-input" value={pp.ddn} onChange={set('ddn')} /></div>
        <div className="fcc-form-group"><label className="fcc-form-label">Nationalité</label><input type="text" className="fcc-form-input" placeholder="Française" value={pp.nationalite} onChange={set('nationalite')} /></div>
      </div>

      <div className="fcc-sub-section"><div className="fcc-sub-section-title">Situation de famille</div></div>
      <div className="fcc-form-row">
        <div className="fcc-form-group">
          <label className="fcc-form-label">Situation matrimoniale</label>
          <select className="fcc-form-select" value={pp.situation} onChange={set('situation')}>
            <option value="">— Sélectionner —</option>
            {['Marié(e)', 'Pacsé(e)', 'Concubinage', 'Divorcé(e)', 'Veuf(ve)', 'Célibataire'].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div className="fcc-form-group">
          <label className="fcc-form-label">Régime / Convention</label>
          <select className="fcc-form-select" value={pp.regime} onChange={set('regime')}>
            <option value="">— Sélectionner —</option>
            {['Communauté réduite aux acquêts (légal)', 'Communauté universelle', 'Séparation de biens', 'Participation aux acquêts', 'Sans objet'].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
      </div>

      <div className="fcc-sub-section"><div className="fcc-sub-section-title">Profession</div></div>
      <div className="fcc-form-row">
        <div className="fcc-form-group"><label className="fcc-form-label">Profession</label><input type="text" className="fcc-form-input" placeholder="Médecin, Chef d'entreprise…" value={pp.profession} onChange={set('profession')} /></div>
        <div className="fcc-form-group">
          <label className="fcc-form-label">Statut</label>
          <select className="fcc-form-select" value={pp.statut} onChange={set('statut')}>
            <option value="">— Sélectionner —</option>
            {['TNS', 'Salarié(e)', 'Fonctionnaire', 'Dirigeant', 'Retraité(e)', 'Autre'].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
      </div>
      <div className="fcc-form-row">
        <div className="fcc-form-group"><label className="fcc-form-label">Secteur d'activité</label><input type="text" className="fcc-form-input" placeholder="Finance, Santé…" value={pp.secteur} onChange={set('secteur')} /></div>
        <div className="fcc-form-group"><label className="fcc-form-label">Société</label><input type="text" className="fcc-form-input" placeholder="Nom de l'entreprise" value={pp.societe} onChange={set('societe')} /></div>
      </div>

      <div className="fcc-sub-section"><div className="fcc-sub-section-title">B — Situation financière</div></div>
      <div className="fcc-form-row">
        <div className="fcc-form-group"><label className="fcc-form-label">Revenus annuels (en K€)</label><input type="number" className="fcc-form-input" placeholder="ex. 120" value={pp.revenus} onChange={set('revenus')} /></div>
        <div className="fcc-form-group"><label className="fcc-form-label">Charges courantes globales (en K€)</label><input type="number" className="fcc-form-input" placeholder="ex. 60" value={pp.charges} onChange={set('charges')} /></div>
      </div>

      <div className="fcc-sub-section"><div className="fcc-sub-section-title">Synthèse Patrimoine</div></div>
      <div style={{ fontSize: 12, color: 'var(--fcc-muted)', marginBottom: 12 }}>Indiquez en K€ ou en % du patrimoine global</div>
      <div className="fcc-form-row">
        <div className="fcc-form-group"><label className="fcc-form-label">Immobilier</label><input type="text" className="fcc-form-input" placeholder="K€ ou %" value={pp.patImmo} onChange={set('patImmo')} /></div>
        <div className="fcc-form-group"><label className="fcc-form-label">Épargne long terme</label><input type="text" className="fcc-form-input" placeholder="K€ ou %" value={pp.patEpargne} onChange={set('patEpargne')} /></div>
      </div>
      <div className="fcc-form-row">
        <div className="fcc-form-group"><label className="fcc-form-label">Participations</label><input type="text" className="fcc-form-input" placeholder="K€ ou %" value={pp.patPartici} onChange={set('patPartici')} /></div>
        <div className="fcc-form-group"><label className="fcc-form-label">Liquidités / Bancaires</label><input type="text" className="fcc-form-input" placeholder="K€ ou %" value={pp.patLiqui} onChange={set('patLiqui')} /></div>
      </div>
      <div className="fcc-form-group"><label className="fcc-form-label">Autres (œuvres d'art…)</label><input type="text" className="fcc-form-input" placeholder="K€ ou %" value={pp.patAutres} onChange={set('patAutres')} /></div>
    </>
  );
}

// ─── Section 1 PM ──────────────────────────────────────────────────────────
function Section1PM({ pm, setPm }: { pm: PmFields; setPm: React.Dispatch<React.SetStateAction<PmFields>> }) {
  const set = (field: keyof Omit<PmFields, 'benef'>) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setPm(prev => ({ ...prev, [field]: e.target.value }));
  const setBenef = (idx: number, field: keyof BenefRow) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setPm(prev => ({ ...prev, benef: prev.benef.map((b, i) => i === idx ? { ...b, [field]: e.target.value } : b) }));

  return (
    <>
      <div className="fcc-intro-banner">
        L'objectif de cette Fiche Connaissance Client est de recueillir des informations concernant votre société pour nous permettre de vous recommander des produits ou des services adéquats. Vous êtes invités à nous fournir des informations exactes, complètes et précises.
      </div>

      <div className="fcc-sub-section"><div className="fcc-sub-section-title">A — Identification de la société</div></div>
      <div className="fcc-form-group"><label className="fcc-form-label">Dénomination sociale <span className="fcc-required">*</span></label><input type="text" className="fcc-form-input" placeholder="Nom de la société" value={pm.denomination} onChange={set('denomination')} /></div>
      <div className="fcc-form-row">
        <div className="fcc-form-group">
          <label className="fcc-form-label">Forme juridique</label>
          <select className="fcc-form-select" value={pm.formeJuridique} onChange={set('formeJuridique')}>
            <option value="">— Sélectionner —</option>
            {['SARL', 'SAS', 'SASU', 'SA', 'SNC', 'SCI', 'EURL', 'Autre'].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div className="fcc-form-group"><label className="fcc-form-label">N° SIREN</label><input type="text" className="fcc-form-input" placeholder="123 456 789" value={pm.siren} onChange={set('siren')} /></div>
      </div>
      <div className="fcc-form-row">
        <div className="fcc-form-group"><label className="fcc-form-label">Code NAF / APE</label><input type="text" className="fcc-form-input" placeholder="ex. 6420Z" value={pm.naf} onChange={set('naf')} /></div>
        <div className="fcc-form-group"><label className="fcc-form-label">Adresse e-mail <span className="fcc-required">*</span></label><input type="email" className="fcc-form-input" placeholder="contact@societe.fr" value={pm.email} onChange={set('email')} /></div>
      </div>
      <div className="fcc-form-group"><label className="fcc-form-label">Adresse du siège social</label><input type="text" className="fcc-form-input" placeholder="Rue, numéro" value={pm.adresse} onChange={set('adresse')} /></div>
      <div className="fcc-form-row">
        <div className="fcc-form-group"><label className="fcc-form-label">Code Postal</label><input type="text" className="fcc-form-input" placeholder="75000" value={pm.cp} onChange={set('cp')} /></div>
        <div className="fcc-form-group"><label className="fcc-form-label">Ville</label><input type="text" className="fcc-form-input" placeholder="Paris" value={pm.ville} onChange={set('ville')} /></div>
      </div>
      <div className="fcc-form-row">
        <div className="fcc-form-group"><label className="fcc-form-label">Téléphone</label><input type="tel" className="fcc-form-input" placeholder="+33 1 00 00 00 00" value={pm.tel} onChange={set('tel')} /></div>
      </div>

      <div className="fcc-sub-section"><div className="fcc-sub-section-title">B — Représentant légal</div></div>
      <div className="fcc-form-row">
        <div className="fcc-form-group"><label className="fcc-form-label">Nom du représentant <span className="fcc-required">*</span></label><input type="text" className="fcc-form-input" placeholder="Nom" value={pm.repNom} onChange={set('repNom')} /></div>
        <div className="fcc-form-group"><label className="fcc-form-label">Prénom</label><input type="text" className="fcc-form-input" placeholder="Prénom" value={pm.repPrenom} onChange={set('repPrenom')} /></div>
      </div>
      <div className="fcc-form-group"><label className="fcc-form-label">Fonction / Qualité</label><input type="text" className="fcc-form-input" placeholder="Gérant, Président, Directeur général…" value={pm.repFonction} onChange={set('repFonction')} /></div>

      <div className="fcc-sub-section"><div className="fcc-sub-section-title">C — Bénéficiaires effectifs</div></div>
      <div style={{ fontSize: 12, color: 'var(--fcc-muted)', marginBottom: 12 }}>Personnes physiques détenant directement ou indirectement plus de 25% du capital ou des droits de vote</div>
      <table className="fcc-benef-table">
        <thead>
          <tr>
            <th style={{ width: '25%' }}>Nom</th>
            <th style={{ width: '25%' }}>Prénom</th>
            <th style={{ width: '25%' }}>Date de naissance</th>
            <th style={{ width: '25%' }}>% Détention</th>
          </tr>
        </thead>
        <tbody>
          {pm.benef.map((b, i) => (
            <tr key={i}>
              <td><input type="text" placeholder="Nom" value={b.nom} onChange={setBenef(i, 'nom')} /></td>
              <td><input type="text" placeholder="Prénom" value={b.prenom} onChange={setBenef(i, 'prenom')} /></td>
              <td><input type="date" value={b.ddn} onChange={setBenef(i, 'ddn')} /></td>
              <td><input type="number" placeholder="ex. 50" min={0} max={100} value={b.pct} onChange={setBenef(i, 'pct')} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="fcc-sub-section" style={{ marginTop: 24 }}><div className="fcc-sub-section-title">D — Situation financière</div></div>
      <div className="fcc-form-row">
        <div className="fcc-form-group"><label className="fcc-form-label">Chiffre d'affaires annuel (en K€)</label><input type="number" className="fcc-form-input" placeholder="ex. 500" value={pm.revenus} onChange={set('revenus')} /></div>
        <div className="fcc-form-group"><label className="fcc-form-label">Charges annuelles (en K€)</label><input type="number" className="fcc-form-input" placeholder="ex. 300" value={pm.charges} onChange={set('charges')} /></div>
      </div>

      <div className="fcc-sub-section"><div className="fcc-sub-section-title">Synthèse Patrimoine</div></div>
      <div style={{ fontSize: 12, color: 'var(--fcc-muted)', marginBottom: 12 }}>Indiquez en K€ ou en % du patrimoine global</div>
      <div className="fcc-form-row">
        <div className="fcc-form-group"><label className="fcc-form-label">Immobilier</label><input type="text" className="fcc-form-input" placeholder="K€ ou %" value={pm.patImmo} onChange={set('patImmo')} /></div>
        <div className="fcc-form-group"><label className="fcc-form-label">Épargne long terme</label><input type="text" className="fcc-form-input" placeholder="K€ ou %" value={pm.patEpargne} onChange={set('patEpargne')} /></div>
      </div>
      <div className="fcc-form-row">
        <div className="fcc-form-group"><label className="fcc-form-label">Participations</label><input type="text" className="fcc-form-input" placeholder="K€ ou %" value={pm.patPartici} onChange={set('patPartici')} /></div>
        <div className="fcc-form-group"><label className="fcc-form-label">Liquidités / Bancaires</label><input type="text" className="fcc-form-input" placeholder="K€ ou %" value={pm.patLiqui} onChange={set('patLiqui')} /></div>
      </div>
      <div className="fcc-form-group"><label className="fcc-form-label">Autres</label><input type="text" className="fcc-form-input" placeholder="K€ ou %" value={pm.patAutres} onChange={set('patAutres')} /></div>
    </>
  );
}
