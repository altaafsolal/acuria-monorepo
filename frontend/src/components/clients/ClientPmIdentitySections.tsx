import Select from '../ui/Select';
import type { BeneficiaryFields, ClientInputFields } from '../../types';

const LEGAL_FORMS = ['SAS', 'SASU', 'SARL', 'EURL', 'SA', 'SCI', 'SNC', 'Autre'] as const;
const BE_INDICES = [1, 2, 3, 4] as const;

type BeIndex = (typeof BE_INDICES)[number];
type BeKey = `be${BeIndex}`;

const EMPTY_BE: BeneficiaryFields = {
  nom: null,
  ddn: null,
  lieuNaissance: null,
  nationalite: null,
  adresse: null,
  residenceFiscale: null,
  detention: null,
};

interface ClientPmIdentitySectionsProps {
  form: ClientInputFields;
  setField: <K extends keyof ClientInputFields>(key: K, value: ClientInputFields[K]) => void;
  setBeField?: (index: BeIndex, key: keyof BeneficiaryFields, value: string) => void;
  variant: 'identite' | 'societe';
}

export default function ClientPmIdentitySections({
  form,
  setField,
  setBeField,
  variant,
}: ClientPmIdentitySectionsProps) {
  const getBe = (index: BeIndex): BeneficiaryFields => {
    const key = `be${index}` as BeKey;
    return form[key] ?? EMPTY_BE;
  };

  if (variant === 'identite') {
    return (
      <section className="cp-section">
        <h3 className="cp-section-title">Situation financière &amp; Patrimoine</h3>
        <div className="cp-form-grid">
          <label className="cp-field">
            <span>Chiffre d&apos;affaires</span>
            <input
              value={form.revenue || ''}
              onChange={(e) => setField('revenue', e.target.value)}
              placeholder="K€"
            />
          </label>
          <label className="cp-field">
            <span>Total bilan</span>
            <input
              value={form.totalBalance || ''}
              onChange={(e) => setField('totalBalance', e.target.value)}
              placeholder="K€"
            />
          </label>
          <label className="cp-field">
            <span>Fonds propres</span>
            <input
              value={form.equity || ''}
              onChange={(e) => setField('equity', e.target.value)}
              placeholder="K€"
            />
          </label>
          <label className="cp-field">
            <span>Fiscalité</span>
            <input
              value={form.taxation || ''}
              onChange={(e) => setField('taxation', e.target.value)}
              placeholder="IS, IR…"
            />
          </label>
          <label className="cp-field">
            <span>Immobilier</span>
            <input
              value={form.patrimoineImmobilier || ''}
              onChange={(e) => setField('patrimoineImmobilier', e.target.value)}
              placeholder="K€ ou %"
            />
          </label>
          <label className="cp-field">
            <span>Épargne long terme</span>
            <input
              value={form.patrimoineEpargne || ''}
              onChange={(e) => setField('patrimoineEpargne', e.target.value)}
              placeholder="K€ ou %"
            />
          </label>
          <label className="cp-field">
            <span>Participations</span>
            <input
              value={form.patrimoineParticipations || ''}
              onChange={(e) => setField('patrimoineParticipations', e.target.value)}
              placeholder="K€ ou %"
            />
          </label>
          <label className="cp-field">
            <span>Liquidités</span>
            <input
              value={form.patrimoineLiquidites || ''}
              onChange={(e) => setField('patrimoineLiquidites', e.target.value)}
              placeholder="K€ ou %"
            />
          </label>
          <label className="cp-field cp-field-full">
            <span>Autres</span>
            <input
              value={form.patrimoineAutres || ''}
              onChange={(e) => setField('patrimoineAutres', e.target.value)}
              placeholder="K€ ou %"
            />
          </label>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="cp-section">
        <h3 className="cp-section-title">Identité — Personne morale</h3>
        <div className="cp-form-grid">
          <label className="cp-field cp-field-full">
            <span>Dénomination sociale</span>
            <input
              value={form.tradeName || ''}
              onChange={(e) => setField('tradeName', e.target.value)}
              style={{ textTransform: 'uppercase' }}
            />
          </label>
          <label className="cp-field">
            <span>Nom commercial</span>
            <input value={form.name || ''} onChange={(e) => setField('name', e.target.value)} />
          </label>
          <label className="cp-field">
            <span>Forme juridique</span>
            <Select
              value={form.legalForm || ''}
              onChange={(e) => setField('legalForm', e.target.value)}
            >
              <option value="">—</option>
              {LEGAL_FORMS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </Select>
          </label>
          <label className="cp-field">
            <span>SIREN</span>
            <input
              value={form.siren || ''}
              onChange={(e) => setField('siren', e.target.value)}
              placeholder="9 chiffres"
            />
          </label>
          <label className="cp-field">
            <span>Code NAF</span>
            <input
              value={form.nafCode || ''}
              onChange={(e) => setField('nafCode', e.target.value)}
              placeholder="ex. 6430Z"
            />
          </label>
          <label className="cp-field cp-field-full">
            <span>Activité</span>
            <input value={form.activity || ''} onChange={(e) => setField('activity', e.target.value)} />
          </label>
          <label className="cp-field">
            <span>Email</span>
            <input type="email" value={form.email || ''} onChange={(e) => setField('email', e.target.value)} />
          </label>
          <label className="cp-field">
            <span>Téléphone</span>
            <input type="tel" value={form.phone || ''} onChange={(e) => setField('phone', e.target.value)} />
          </label>
          <label className="cp-field cp-field-full">
            <span>Adresse siège</span>
            <input value={form.address || ''} onChange={(e) => setField('address', e.target.value)} />
          </label>
          <label className="cp-field">
            <span>Code postal</span>
            <input value={form.postalCode || ''} onChange={(e) => setField('postalCode', e.target.value)} />
          </label>
          <label className="cp-field">
            <span>Ville</span>
            <input value={form.city || ''} onChange={(e) => setField('city', e.target.value)} />
          </label>
          <label className="cp-field">
            <span>Pays fiscal</span>
            <input
              value={form.fiscalCountry || form.country || ''}
              onChange={(e) => setField('fiscalCountry', e.target.value)}
            />
          </label>
          <label className="cp-field">
            <span>Représentant légal</span>
            <input
              value={form.legalRepName || ''}
              onChange={(e) => setField('legalRepName', e.target.value)}
            />
          </label>
          <label className="cp-field">
            <span>Fonction</span>
            <input
              value={form.legalRepRole || ''}
              onChange={(e) => setField('legalRepRole', e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="cp-section">
        <h3 className="cp-section-title">Bénéficiaires effectifs (≥ 25%)</h3>
        <div className="cp-be-list">
          {BE_INDICES.map((index) => {
            const be = getBe(index);
            const nom = be.nom?.trim() ?? '';
            const defaultOpen = index === 1 || Boolean(nom);

            return (
              <details key={index} className="cp-be-accordion" open={defaultOpen}>
                <summary className="cp-be-accordion-summary">
                  Bénéficiaire {index}
                  {nom ? ` — ${nom}` : ''}
                </summary>
                <div className="cp-be-accordion-body">
                  <label className="cp-field">
                    <span>Nom complet</span>
                    <input
                      value={be.nom ?? ''}
                      onChange={(e) => setBeField!(index, 'nom', e.target.value)}
                    />
                  </label>
                  <label className="cp-field">
                    <span>Date de naissance</span>
                    <input
                      value={be.ddn ?? ''}
                      onChange={(e) => setBeField!(index, 'ddn', e.target.value)}
                    />
                  </label>
                  <label className="cp-field">
                    <span>Lieu de naissance</span>
                    <input
                      value={be.lieuNaissance ?? ''}
                      onChange={(e) => setBeField!(index, 'lieuNaissance', e.target.value)}
                    />
                  </label>
                  <label className="cp-field">
                    <span>Nationalité</span>
                    <input
                      value={be.nationalite ?? ''}
                      onChange={(e) => setBeField!(index, 'nationalite', e.target.value)}
                    />
                  </label>
                  <label className="cp-field cp-field-full">
                    <span>Adresse</span>
                    <input
                      value={be.adresse ?? ''}
                      onChange={(e) => setBeField!(index, 'adresse', e.target.value)}
                    />
                  </label>
                  <label className="cp-field">
                    <span>Résidence fiscale</span>
                    <input
                      value={be.residenceFiscale ?? ''}
                      onChange={(e) => setBeField!(index, 'residenceFiscale', e.target.value)}
                    />
                  </label>
                  <label className="cp-field">
                    <span>% détention</span>
                    <input
                      value={be.detention ?? ''}
                      onChange={(e) => setBeField!(index, 'detention', e.target.value)}
                      placeholder="ex. 35%"
                    />
                  </label>
                </div>
              </details>
            );
          })}
        </div>
      </section>
    </>
  );
}
