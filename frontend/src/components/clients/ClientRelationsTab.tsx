import { useMemo, useState } from "react";
import {
  FiAward,
  FiBriefcase,
  FiHeart,
  FiLink2,
  FiPercent,
  FiPlus,
  FiTrash2,
  FiUser,
  FiUsers,
} from "react-icons/fi";
import type { Client, ClientRelation } from "../../types";
import AddRelationModal, { type AddRelationInput } from "./AddRelationModal";
import "./ClientRelationsTab.css";

export type { AddRelationInput, RelationRoleValue } from "./AddRelationModal";
export { RELATION_ROLE_OPTIONS } from "./AddRelationModal";

type RelationTypeConfig = {
  icon: typeof FiLink2;
  variant: string;
};

function relationVariant(type: string): string {
  const normalized = type.toLowerCase();
  if (normalized.includes("conjoint")) return "conjoint";
  if (normalized.includes("parent") || normalized.includes("enfant"))
    return "family";
  if (
    normalized.includes("bénéficiaire") ||
    normalized.includes("beneficiaire")
  )
    return "be";
  if (normalized.includes("dirigeant")) return "dirigeant";
  if (normalized.includes("associé") || normalized.includes("associe"))
    return "associe";
  return "other";
}

function relationConfig(type: string | null): RelationTypeConfig {
  const variant = relationVariant(type || "");
  const icons: Record<string, RelationTypeConfig["icon"]> = {
    conjoint: FiHeart,
    family: FiUsers,
    associe: FiBriefcase,
    dirigeant: FiAward,
    be: FiPercent,
    other: FiLink2,
  };
  return { icon: icons[variant] ?? FiLink2, variant };
}

function relatedClientName(relation: ClientRelation): string {
  return relation.clientBName || relation.clientAName || "Client lié";
}

interface ClientRelationsTabProps {
  clientId: string;
  relations: ClientRelation[];
  allClients: Client[];
  isAdding: boolean;
  onAddRelation: (input: AddRelationInput, onSuccess?: () => void) => void;
  onDeleteRelation: (id: string) => void;
}

export default function ClientRelationsTab({
  clientId,
  relations,
  allClients,
  isAdding,
  onAddRelation,
  onDeleteRelation,
}: ClientRelationsTabProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const sortedRelations = useMemo(
    () =>
      [...relations].sort((a, b) =>
        relatedClientName(a).localeCompare(relatedClientName(b), "fr"),
      ),
    [relations],
  );

  const handleSubmit = (input: AddRelationInput) => {
    onAddRelation(input, () => setModalOpen(false));
  };

  return (
    <div className="cp-relations">
      <div className="cp-relations-toolbar">
        <div className="cp-relations-list-header">
          <h3 className="cp-relations-list-header__title">
            Relations avec d'autres clients NM
            <span className="cp-relations-list-header__count">
              {relations.length}
            </span>
          </h3>
        </div>
        <button
          type="button"
          className="btn-bronze btn-sm"
          onClick={() => setModalOpen(true)}
        >
          <FiPlus aria-hidden="true" />
          Nouvelle relation
        </button>
      </div>

      {sortedRelations.length === 0 ? (
        <div className="cp-relations-empty">
          <FiLink2 aria-hidden="true" />
          <p>Aucune relation enregistrée.</p>
          <span>Ajoutez un lien avec un autre client du cabinet.</span>
        </div>
      ) : (
        <ul className="cp-relations-list">
          {sortedRelations.map((relation) => {
            const config = relationConfig(relation.typeRelation);
            const Icon = config.icon;
            const name = relatedClientName(relation);

            return (
              <li
                key={relation.id}
                className={`cp-relation-card cp-relation-card--${config.variant}`}
              >
                <div className="cp-relation-card__accent" aria-hidden="true" />
                <div className="cp-relation-card__body">
                  <div className="cp-relation-card__header">
                    <span
                      className={`cp-relation-badge cp-relation-badge--${config.variant}`}
                    >
                      <Icon aria-hidden="true" />
                      {relation.typeRelation || "Relation"}
                    </span>
                    <button
                      type="button"
                      className="cp-relation-card__delete"
                      onClick={() => onDeleteRelation(relation.id)}
                      aria-label="Supprimer la relation"
                    >
                      <FiTrash2 aria-hidden="true" />
                    </button>
                  </div>

                  <div className="cp-relation-card__client">
                    <span
                      className="cp-relation-card__avatar"
                      aria-hidden="true"
                    >
                      <FiUser />
                    </span>
                    <div>
                      <h4 className="cp-relation-card__name">{name}</h4>
                      <div className="cp-relation-card__meta">
                        {relation.pctDetention != null &&
                          relation.pctDetention > 0 && (
                            <span className="cp-relation-card__pct">
                              <FiPercent aria-hidden="true" />
                              {relation.pctDetention} % de détention
                            </span>
                          )}
                      </div>
                    </div>
                  </div>

                  {relation.note && (
                    <p className="cp-relation-card__note">{relation.note}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AddRelationModal
        open={modalOpen}
        clientId={clientId}
        allClients={allClients}
        isSaving={isAdding}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
