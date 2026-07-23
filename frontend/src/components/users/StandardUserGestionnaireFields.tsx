import Select from '../ui/Select';
import type { GestionnaireUserInput } from '../../types/user';

interface StandardUserGestionnaireFieldsProps {
  value: Required<GestionnaireUserInput>;
  onChange: (value: Required<GestionnaireUserInput>) => void;
  emailReadOnly?: boolean;
  emailRequired?: boolean;
}

export default function StandardUserGestionnaireFields({
  value,
  onChange,
  emailReadOnly = false,
  emailRequired = true,
}: StandardUserGestionnaireFieldsProps) {
  const update = <K extends keyof GestionnaireUserInput>(
    field: K,
    fieldValue: GestionnaireUserInput[K],
  ) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <div className="tenant-form__fields tenant-form__fields--gestionnaire">
      <label className="field">
        <span>Prénom</span>
        <div className="field-input">
          <input
            type="text"
            value={value.firstName}
            onChange={(e) => update('firstName', e.target.value)}
            required
          />
        </div>
      </label>

      <label className="field">
        <span>Nom</span>
        <div className="field-input">
          <input
            type="text"
            value={value.lastName}
            onChange={(e) => update('lastName', e.target.value)}
            required
          />
        </div>
      </label>

      <label className="field">
        <span>E-mail</span>
        <div className="field-input">
          <input
            type="email"
            value={value.email}
            onChange={(e) => update('email', e.target.value)}
            readOnly={emailReadOnly}
            required={emailRequired}
          />
        </div>
      </label>

      <label className="field">
        <span>Téléphone</span>
        <div className="field-input">
          <input
            type="tel"
            value={value.phone}
            onChange={(e) => update('phone', e.target.value)}
          />
        </div>
      </label>

      <label className="field">
        <span>Rôle</span>
        <div className="field-input">
          <input
            type="text"
            value={value.role}
            onChange={(e) => update('role', e.target.value)}
            placeholder="Conseiller, Gestionnaire…"
          />
        </div>
      </label>

      <label className="field">
        <span>Statut</span>
        <Select
          value={value.status}
          onChange={(e) => update('status', e.target.value)}
        >
          <option value="Actif">Actif</option>
          <option value="Inactif">Inactif</option>
        </Select>
      </label>

      <label className="field field--checkbox">
        <span>Peut signer Docusign</span>
        <input
          type="checkbox"
          checked={value.peutSignerDocusign}
          onChange={(e) => update('peutSignerDocusign', e.target.checked)}
        />
      </label>

      <label className="field">
        <span>Initiales</span>
        <div className="field-input">
          <input
            type="text"
            value={value.initiales}
            onChange={(e) => update('initiales', e.target.value)}
            placeholder="AB"
          />
        </div>
      </label>
    </div>
  );
}
