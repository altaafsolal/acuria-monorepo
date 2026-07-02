import { isPersonneMorale } from '../../utils/kyc';

export type KycDocumentCategory = 'obligatoire' | 'complementaire';

export interface KycDocumentCatalogItem {
  docType: string;
  label: string;
  category: KycDocumentCategory;
}

export const KYC_DOCUMENT_CATALOG_PP: KycDocumentCatalogItem[] = [
  {
    docType: 'CNI / Passeport',
    label: 'CNI / Passeport',
    category: 'obligatoire',
  },
  {
    docType: 'Justificatif de domicile (-3 mois)',
    label: 'Justificatif de domicile (-3 mois)',
    category: 'obligatoire',
  },
  {
    docType: 'RIB',
    label: 'RIB',
    category: 'obligatoire',
  },
  {
    docType: 'Dernier avis IR / IFI',
    label: 'Dernier avis IR / IFI',
    category: 'complementaire',
  },
  {
    docType: 'Actes de donations / successions',
    label: 'Actes de donations / successions',
    category: 'complementaire',
  },
];

export const KYC_DOCUMENT_CATALOG_PM: KycDocumentCatalogItem[] = [
  {
    docType: 'Derniers statuts à jour',
    label: 'Derniers statuts à jour',
    category: 'obligatoire',
  },
  {
    docType: 'Derniers bilans',
    label: 'Derniers bilans',
    category: 'obligatoire',
  },
  {
    docType: 'Kbis (-3 mois)',
    label: 'Kbis (-3 mois)',
    category: 'obligatoire',
  },
  {
    docType: 'Registre des Bénéficiaires Effectifs',
    label: 'Registre des Bénéficiaires Effectifs',
    category: 'obligatoire',
  },
  {
    docType: 'RIB',
    label: 'RIB',
    category: 'obligatoire',
  },
  {
    docType: 'CNI / Passeport du représentant',
    label: 'CNI / Passeport du représentant',
    category: 'obligatoire',
  },
  {
    docType: "Pièces d'identité des BE",
    label: "Pièces d'identité des BE",
    category: 'complementaire',
  },
  {
    docType: "Détail de l'actionnariat",
    label: "Détail de l'actionnariat",
    category: 'complementaire',
  },
  {
    docType: 'LEI',
    label: 'LEI',
    category: 'complementaire',
  },
];

/** @deprecated Use getDocumentCatalog(clientType) */
export const KYC_DOCUMENT_CATALOG = KYC_DOCUMENT_CATALOG_PP;

export function getDocumentCatalog(clientType: string): KycDocumentCatalogItem[] {
  return isPersonneMorale(clientType) ? KYC_DOCUMENT_CATALOG_PM : KYC_DOCUMENT_CATALOG_PP;
}

export function catalogByCategory(
  catalog: KycDocumentCatalogItem[],
  category: KycDocumentCategory,
): KycDocumentCatalogItem[] {
  return catalog.filter((item) => item.category === category);
}

export function findCatalogDocument(
  docType: string,
  clientType?: string,
): KycDocumentCatalogItem | undefined {
  const normalized = docType.trim().toLowerCase();
  const catalogs = clientType
    ? [getDocumentCatalog(clientType)]
    : [KYC_DOCUMENT_CATALOG_PP, KYC_DOCUMENT_CATALOG_PM];

  for (const catalog of catalogs) {
    const match = catalog.find(
      (item) =>
        item.docType.toLowerCase() === normalized
        || item.label.toLowerCase() === normalized,
    );
    if (match) return match;
  }
  return undefined;
}
