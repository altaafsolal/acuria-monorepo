export const OBJECTIVES = [
  'Se constituer une épargne de précaution',
  'Placer des liquidités à court terme',
  'Obtenir des revenus complémentaires',
  'Se constituer un patrimoine',
  'Financer un achat immobilier',
  'Préparer la transmission de son patrimoine',
  'Optimiser la rentabilité de ses placements',
  'Protéger le conjoint survivant',
  'Préparer la transmission de son entreprise',
  'Se prémunir contre les accidents de la vie',
  'Aider ses enfants',
  'Optimiser sa fiscalité',
  'Préparer sa retraite',
  'Protéger ses proches',
];

export const PRODUCTS = [
  'Actions ou OPCVM à dominante actions',
  'Obligations ou OPCVM à dominante obligataires',
  'Titres de sociétés non cotées ou FIP, FCPI, FCPR',
  'Produits monétaires, OPCVM monétaire, fonds euros',
  'OPCVM diversifié',
  'Produits structurés',
  'Autres (options, gestion alternative…)',
  'Produits bancaires (livret, PEL…)',
  'Immobilier (réel, SCPI, Duflot, LMNP, OPCI…)',
  'Assurance-vie, contrat de capitalisation',
  'Opération de défiscalisation DomTom (Girardin…)',
  'PEE, Participation, Perco…',
  'SCI',
];

export const INFO_MODES = [
  'Lecture de la presse spécialisée',
  'Suivi des placements financiers de manière mensuelle',
  'Suivi des placements immobiliers au moins tous les ans',
  'Rencontres régulières avec des sociétés de gestion pour s\'informer des tendances',
  'Participation à des conférences spécialisées en finance',
  'Suivi des comptes bancaires à période régulière',
];

export const AFFIRMATIONS = [
  'La vente dans l\'urgence des éléments de mon patrimoine peut m\'amener à subir une moins-value',
  'Plus un produit est risqué, plus sa valeur et sa performance peuvent varier fortement à la hausse comme à la baisse',
  'Moins mon patrimoine est diversifié, plus il est exposé aux risques de variation d\'une valeur',
  'Tout produit d\'épargne peut présenter un ou plusieurs risques autres qu\'une variation de sa valeur',
  'Pour un même placement, le risque est différent selon l\'échéance de mon placement (1 an, 5 ans, 10 ans)',
  'La structure de mon patrimoine doit être cohérente avec mes objectifs, mes contraintes personnelles et les évènements probables',
];

export const GESTION_OPTIONS = [
  { label: 'A été déléguée à un gestionnaire', score: 5 },
  { label: "A été gérée par moi-même sans l'aide d'un conseiller", score: 20 },
  { label: "A été gérée par moi-même avec l'aide d'un conseiller", score: 10 },
];

export interface RiskOption { key?: string; label: string; score: number }
export interface RiskGroup { stateKey: string; options: RiskOption[] }

export const RISK_DATA: Record<string, RiskGroup> = {
  'risk_patri': {
    stateKey: 'risk_patri',
    options: [
      { key: 'A', label: 'A — Variation maximale acceptable : faible (portefeuille sécurisé)', score: 5 },
      { key: 'B', label: 'B — Variation maximale acceptable : modérée (portefeuille équilibré)', score: 10 },
      { key: 'C', label: 'C — Variation maximale acceptable : forte (portefeuille dynamique)', score: 15 },
    ],
  },
  'risk_produit': {
    stateKey: 'risk_produit',
    options: [
      { key: 'A', label: 'A — Variation maximale sur un produit : ≤ +1% / -1%', score: 5 },
      { key: 'B', label: 'B — Variation maximale sur un produit : ≤ +10% / -10%', score: 10 },
      { key: 'C', label: 'C — Variation maximale sur un produit : ≤ +20% / -20%', score: 15 },
      { key: 'D', label: 'D — Variation maximale sur un produit : > 20%', score: 20 },
    ],
  },
  'risk_reaction': {
    stateKey: 'risk_reaction',
    options: [
      { label: 'Liquidation des placements à risque', score: 5 },
      { label: "Vente d'une partie des investissements et réallocation du portefeuille", score: 10 },
      { label: "Conservation de l'investissement et attente d'un regain de valeur", score: 15 },
      { label: 'Réinvestissement pour diminuer le coût de revient', score: 20 },
    ],
  },
  'risk_pertes': {
    stateKey: 'risk_pertes',
    options: [
      { label: 'Tout a été vendu', score: 5 },
      { label: "Seulement une partie a été vendue", score: 10 },
      { label: 'Tout a été conservé', score: 15 },
      { label: 'Un réinvestissement a été effectué', score: 20 },
    ],
  },
  'risk_crises': {
    stateKey: 'risk_crises',
    options: [
      { label: "Nous n'avons pas entendu parler de crises", score: 5 },
      { label: 'Très mal', score: 10 },
      { label: 'Suivi constant sans panique', score: 15 },
      { label: 'Sereinement, les marchés finissent toujours par remonter', score: 20 },
    ],
  },
  'risk_liqui': {
    stateKey: 'risk_liqui',
    options: [
      { label: 'Toujours avoir une part importante de mes actifs liquides, au cas où', score: 5 },
      { label: 'Conserver systématiquement une trésorerie importante', score: 10 },
      { label: "Garder ce dont j'ai besoin car je sais vendre des actifs rapidement", score: 15 },
    ],
  },
  'risk_appetence': {
    stateKey: 'risk_appetence',
    options: [
      { label: 'Non', score: 5 },
      { label: 'Parfois, si les conséquences sont faibles', score: 10 },
      { label: 'Assez souvent, si les risques et leurs conséquences sont maîtrisées', score: 15 },
      { label: 'Autant que possible, les conséquences seront assurées', score: 20 },
    ],
  },
  'risk_horizon': {
    stateKey: 'risk_horizon',
    options: [
      { key: 'court', label: 'Entre 6 mois et 3 ans (court terme — prise de risque faible)', score: 5 },
      { key: 'moyen', label: 'Entre 4 et 10 ans (moyen terme — prise de risque équilibrée)', score: 10 },
      { key: 'long', label: 'Entre 11 et 15 ans (long terme — prise de risque forte)', score: 15 },
      { key: 'tlong', label: 'Supérieur à 15 ans (très long terme — prise de risque élevée)', score: 20 },
    ],
  },
  'risk_global': {
    stateKey: 'risk_global',
    options: [
      { label: 'Sécurité : placement sûr, performance moins élevée, volatilité très faible', score: 101 },
      { label: 'Prudent : variation modérée, volatilité faible', score: 102 },
      { label: 'Équilibré : valorisation moyen-long terme, volatilité moyenne', score: 103 },
      { label: 'Dynamique : performance privilégiée, forte volatilité, risque élevé', score: 104 },
    ],
  },
};

export interface ConnProfile { label: string; cls: string; range: string }
export interface RiskProfile { label: string; cls: string; range: string }

export function getConnProfile(score: number): ConnProfile {
  if (score >= 216) return { label: 'Investisseur Avancé', cls: 'fcc-profile-dynamique', range: '216–274' };
  if (score >= 158) return { label: 'Investisseur Averti', cls: 'fcc-profile-equilibre', range: '158–215' };
  if (score >= 102) return { label: 'Investisseur Initial', cls: 'fcc-profile-prudent', range: '102–157' };
  return { label: 'Investisseur Débutant', cls: 'fcc-profile-securite', range: '0–101' };
}

export function getRiskProfile(score: number): RiskProfile {
  if (score >= 124) return { label: 'Dynamique', cls: 'fcc-profile-dynamique', range: '124–150' };
  if (score >= 96) return { label: 'Équilibré', cls: 'fcc-profile-equilibre', range: '96–123' };
  if (score >= 68) return { label: 'Prudent', cls: 'fcc-profile-prudent', range: '68–95' };
  if (score >= 40) return { label: 'Sécurité', cls: 'fcc-profile-securite', range: '40–67' };
  return { label: 'En cours…', cls: '', range: '—' };
}

export type ProductState = { investi: boolean; conn: '' | 'non' | 'peu' | 'bien' };
export type InfoState = '' | 'oui' | 'peu' | 'jamais';
export type AffState = '' | 'vrai' | 'faux';

export interface ObjectiveRow { prio: string; ech: string; comment: string }
export interface BenefRow { nom: string; prenom: string; ddn: string; pct: string }
