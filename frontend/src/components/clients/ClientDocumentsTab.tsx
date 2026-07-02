import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiExternalLink,
  FiFolder,
  FiLink,
  FiPlus,
  FiSave,
  FiX,
} from 'react-icons/fi';
import type { Client, KycDocument } from '../../types';
import {
  docBadgeClass,
  docBadgeLabel,
  formatDateFr,
} from '../../utils/kyc';
import {
  useCreateKycDocument,
  useUpdateKycDocument,
} from '../../hooks/useClientPanel';
import {
  catalogByCategory,
  getDocumentCatalog,
  type KycDocumentCatalogItem,
} from './kycDocumentCatalog';
import './ClientDocumentsTab.css';

function formatDocType(value: string): string {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' / ');
}

function normalizeDocumentUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function toInputDate(value: string | null | undefined): string {
  if (!value) return '';
  return value.slice(0, 10);
}

function resolveDocument(
  documents: KycDocument[],
  item: KycDocumentCatalogItem,
): KycDocument | undefined {
  const exact = documents.find((doc) => doc.docType === item.docType);
  if (exact) return exact;

  const normalizedLabel = item.label.toLowerCase();
  return documents.find((doc) => {
    const type = doc.docType.toLowerCase();
    const formatted = formatDocType(doc.docType).toLowerCase();
    return type === normalizedLabel || formatted === normalizedLabel;
  });
}

interface KycDocumentCollectItemProps {
  item: KycDocumentCatalogItem;
  document: KycDocument | undefined;
  isSaving: boolean;
  onToggleReceived: (checked: boolean) => Promise<void>;
  onUpdateDates: (dateReception: string | null, dateValidite: string | null) => Promise<void>;
  onSaveLink: (url: string | null) => Promise<void>;
}

function KycDocumentCollectItem({
  item,
  document,
  isSaving,
  onToggleReceived,
  onUpdateDates,
  onSaveLink,
}: KycDocumentCollectItemProps) {
  const [linkEditorOpen, setLinkEditorOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState('');
  const [dateReception, setDateReception] = useState(() => toInputDate(document?.dateReception));
  const [dateValidite, setDateValidite] = useState(() => toInputDate(document?.dateValidite));

  const received = Boolean(document?.recu);
  const hasLink = Boolean(document?.urlDocument?.trim());

  useEffect(() => {
    setDateReception(toInputDate(document?.dateReception));
    setDateValidite(toInputDate(document?.dateValidite));
    if (!document?.urlDocument?.trim()) {
      setLinkEditorOpen(false);
    }
  }, [document?.id, document?.dateReception, document?.dateValidite, document?.urlDocument, document?.recu]);

  const openLinkEditor = () => {
    setLinkDraft(document?.urlDocument ?? '');
    setLinkEditorOpen(true);
  };

  const handleSaveLink = async () => {
    const normalized = normalizeDocumentUrl(linkDraft);
    await onSaveLink(normalized || null);
    setLinkEditorOpen(false);
  };

  const handleCancelLink = () => {
    setLinkDraft(document?.urlDocument ?? '');
    setLinkEditorOpen(false);
  };

  const handleDateBlur = async () => {
    if (!received) return;
    await onUpdateDates(
      dateReception || null,
      dateValidite || null,
    );
  };

  return (
    <li
      className={`cp-doc-collect-item${received ? ' cp-doc-collect-item--received' : ''}`}
    >
      <div className="cp-doc-collect-item__header">
        <label className="cp-doc-collect-item__check">
          <input
            type="checkbox"
            checked={received}
            disabled={isSaving}
            onChange={(e) => onToggleReceived(e.target.checked)}
          />
          <span>{item.label}</span>
        </label>
        {received && !linkEditorOpen && (
          <button
            type="button"
            className="cp-doc-collect-item__add-link"
            onClick={openLinkEditor}
            disabled={isSaving}
          >
            <FiPlus aria-hidden="true" />
            {hasLink ? 'Modifier le lien' : 'Ajouter le lien'}
          </button>
        )}
      </div>

      {received && (
        <div className="cp-doc-collect-item__body">
          <div className="cp-doc-collect-item__dates">
            <label className="cp-doc-collect-field">
              <span>Date de réception</span>
              <input
                type="date"
                value={dateReception}
                disabled={isSaving}
                onChange={(e) => setDateReception(e.target.value)}
                onBlur={handleDateBlur}
              />
            </label>
            <label className="cp-doc-collect-field">
              <span>Fin de validité</span>
              <input
                type="date"
                value={dateValidite}
                disabled={isSaving}
                onChange={(e) => setDateValidite(e.target.value)}
                onBlur={handleDateBlur}
              />
            </label>
          </div>

          {hasLink && !linkEditorOpen && (
            <div className="cp-doc-collect-item__link-preview">
              <FiLink aria-hidden="true" />
              <a
                href={normalizeDocumentUrl(document?.urlDocument ?? '')}
                target="_blank"
                rel="noopener noreferrer"
              >
                {document?.urlDocument}
              </a>
              <button
                type="button"
                className="cp-doc-collect-item__open-link"
                onClick={() => window.open(normalizeDocumentUrl(document?.urlDocument ?? ''), '_blank', 'noopener,noreferrer')}
                aria-label="Ouvrir le lien"
              >
                <FiExternalLink aria-hidden="true" />
              </button>
            </div>
          )}

          {linkEditorOpen && (
            <div className="cp-doc-collect-item__link-editor">
              <label className="cp-doc-collect-field cp-doc-collect-field--full">
                <span>
                  <FiLink aria-hidden="true" />
                  Lien du document (Dropbox / SharePoint)
                </span>
                <input
                  type="url"
                  value={linkDraft}
                  placeholder="https://..."
                  disabled={isSaving}
                  onChange={(e) => setLinkDraft(e.target.value)}
                />
              </label>
              <div className="cp-doc-collect-item__link-actions">
                <button
                  type="button"
                  className="btn-bronze btn-sm"
                  onClick={handleSaveLink}
                  disabled={isSaving}
                >
                  <FiSave aria-hidden="true" />
                  Enregistrer
                </button>
                <button
                  type="button"
                  className="btn-secondary btn-secondary--sm"
                  onClick={handleCancelLink}
                  disabled={isSaving}
                >
                  <FiX aria-hidden="true" />
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

interface ClientDocumentsTabProps {
  clientId: string;
  documents: KycDocument[];
  client?: Client | null;
}

export default function ClientDocumentsTab({
  clientId,
  documents,
  client,
}: ClientDocumentsTabProps) {
  const createDocument = useCreateKycDocument(clientId);
  const updateDocument = useUpdateKycDocument(clientId);
  const isSaving = createDocument.isPending || updateDocument.isPending;

  const catalog = useMemo(
    () => getDocumentCatalog(client?.clientType ?? 'PP'),
    [client?.clientType],
  );
  const obligatoires = useMemo(() => catalogByCategory(catalog, 'obligatoire'), [catalog]);
  const complementaires = useMemo(() => catalogByCategory(catalog, 'complementaire'), [catalog]);

  const obligatoiresRecus = obligatoires.filter((item) => {
    const doc = resolveDocument(documents, item);
    return doc?.recu;
  }).length;

  const upsertDocument = async (
    item: KycDocumentCatalogItem,
    patch: {
      recu?: boolean;
      dateReception?: string | null;
      dateValidite?: string | null;
      urlDocument?: string | null;
    },
  ) => {
    const existing = resolveDocument(documents, item);
    if (existing) {
      await updateDocument.mutateAsync({ id: existing.id, ...patch });
      return;
    }
    await createDocument.mutateAsync({
      docType: item.docType,
      recu: patch.recu ?? false,
      dateReception: patch.dateReception,
      dateValidite: patch.dateValidite,
      urlDocument: patch.urlDocument,
    });
  };

  const renderSection = (
    title: string,
    variant: 'required' | 'optional',
    items: KycDocumentCatalogItem[],
  ) => (
    <section className={`cp-doc-collect-section cp-doc-collect-section--${variant}`}>
      <h4 className="cp-doc-collect-section__title">
        <span className={`cp-doc-collect-section__dot cp-doc-collect-section__dot--${variant}`} aria-hidden="true" />
        {title}
      </h4>
      <ul className="cp-doc-collect-list">
        {items.map((item) => {
          const document = resolveDocument(documents, item);
          return (
            <KycDocumentCollectItem
              key={`${item.docType}-${document?.id ?? 'new'}`}
              item={item}
              document={document}
              isSaving={isSaving}
              onToggleReceived={async (checked) => {
                await upsertDocument(item, { recu: checked });
              }}
              onUpdateDates={async (dateReception, dateValidite) => {
                await upsertDocument(item, {
                  recu: true,
                  dateReception,
                  dateValidite,
                });
              }}
              onSaveLink={async (url) => {
                await upsertDocument(item, {
                  recu: true,
                  urlDocument: url,
                });
              }}
            />
          );
        })}
      </ul>
    </section>
  );

  return (
    <div className="cp-documents">
      <section className="cp-documents-summary" aria-label="Documents KYC à collecter">
        <div className="cp-documents-summary__header">
          <FiFolder aria-hidden="true" />
          <div>
            <h3 className="cp-documents-summary__title">Documents KYC à collecter</h3>
            <p className="cp-documents-summary__hint">
              {obligatoiresRecus}/{obligatoires.length} obligatoire{obligatoires.length > 1 ? 's' : ''} reçu{obligatoiresRecus > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="cp-documents-summary__progress" aria-hidden="true">
          <div
            className="cp-documents-summary__progress-bar"
            style={{
              width: obligatoires.length > 0
                ? `${Math.round((obligatoiresRecus / obligatoires.length) * 100)}%`
                : '0%',
            }}
          />
        </div>
      </section>

      <div className="cp-doc-collect">
        {renderSection('Obligatoires', 'required', obligatoires)}
        {renderSection('Complémentaires', 'optional', complementaires)}
      </div>

      {client && (
        <section className="cp-documents-regulatory">
          <h3 className="cp-documents-regulatory__title">Statut des documents réglementaires</h3>
          <div className="cp-documents-regulatory__grid">
            <article className="cp-documents-regulatory__card">
              <span className="cp-documents-regulatory__label">FCC</span>
              <span className={`crm-badge ${docBadgeClass(client.fccStatut)}`}>
                {docBadgeLabel(client.fccStatut)}
              </span>
              <time className="cp-documents-regulatory__date">
                {client.fccDate ? formatDateFr(client.fccDate) : '—'}
              </time>
            </article>
            <article className="cp-documents-regulatory__card">
              <span className="cp-documents-regulatory__label">DER</span>
              <span className={`crm-badge ${docBadgeClass(client.derStatut)}`}>
                {docBadgeLabel(client.derStatut)}
              </span>
              <time className="cp-documents-regulatory__date">
                {client.derDate ? formatDateFr(client.derDate) : '—'}
              </time>
            </article>
            <article className="cp-documents-regulatory__card">
              <span className="cp-documents-regulatory__label">Lettre de mission</span>
              <span className={`crm-badge ${docBadgeClass(client.ldmStatut)}`}>
                {docBadgeLabel(client.ldmStatut)}
              </span>
              <time className="cp-documents-regulatory__date">
                {client.ldmDate ? formatDateFr(client.ldmDate) : '—'}
              </time>
            </article>
          </div>
          <p className="cp-documents-regulatory__hint">
            L&apos;envoi de la DER et de la Lettre de mission se fait depuis la section{' '}
            <Link to="/dashboard/kyc/der">KYC — DER / LdM</Link>.
          </p>
        </section>
      )}
    </div>
  );
}
