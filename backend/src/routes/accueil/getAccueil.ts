import { Router } from 'express';
import { BASEROW_FIELDS } from "../../../baserow/schema.js";
import { authenticate, requireRole, requireTenant} from '../../middleware/index.js';
import { clientMapper, tenantTables, tenantContext, api } from "../../services/baserow/index.js";
import { derIsSent, ldmIsUnlocked } from "../../services/make/index.js";
import { pickLinkRowId, pickTextValue, asyncHandler} from '../../utils/index.js';
import type {
  AccueilResponse,
  AccueilStats,
  AccueilTodoItem,
  DbKycDocument,
} from "../../types/domain.js";

const F_KYC = BASEROW_FIELDS.kycDocuments;
const ID_DOC_TYPES = ["CNI", "Passeport", "Pièce d'identité"];

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'), requireTenant);

router.get('/', asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;

  const ctx = await tenantContext.resolveTenantDbContext(tenantId);
  const [clientsTableId, kycDocsTableId] = await Promise.all([
    tenantTables.resolveTenantTableId(tenantId, "clients"),
    tenantTables.resolveTenantTableId(tenantId, "kyc_documents"),
  ]);

  const [allClients, kycDocs] = await Promise.all([
    api.listAllRows(clientsTableId, {}, ctx).then((rows) => rows.map(clientMapper.mapClientRow)),
    api.listAllRows(kycDocsTableId, {}, ctx).then((rows) => rows.map((row): DbKycDocument => ({
      id: String(row.id),
      name: String(row[F_KYC.name] || ""),
      client_id: pickLinkRowId(row[F_KYC.clientId]),
      client_id_old: pickTextValue(row[F_KYC.clientIdOld]),
      client_nom: pickTextValue(row[F_KYC.clientNom]),
      doc_type: pickTextValue(row[F_KYC.docType]) || "",
      recu: Boolean(row[F_KYC.recu]),
      date_reception: pickTextValue(row[F_KYC.dateReception]),
      date_validite: pickTextValue(row[F_KYC.dateValidite]),
      url_document: pickTextValue(row[F_KYC.urlDocument]),
      airtable_record_id: pickTextValue(row[F_KYC.airtableRecordId]),
    }))),
  ]);

  const clients = clientMapper.excludeArchived(allClients);

  const stats: AccueilStats = {
    crm: {
      total: clients.length,
      prospects: clients.filter((c) => c.statut_client === "Prospect").length,
      actifs: clients.filter((c) => c.statut_client === "Client actif").length,
      inactifs: clients.filter((c) => c.statut_client === "Inactif").length,
    },
    der: {
      total: clients.length,
      aEnvoyer: clients.filter((c) => !c.der_statut || c.der_statut === "Non envoyé").length,
      derEnvoye: clients.filter((c) => c.der_statut === "Envoyé").length,
      ldmEnvoye: clients.filter((c) => c.ldm_statut === "Envoyé").length,
      signe: clients.filter((c) => c.ldm_statut === "Signé").length,
    },
    fcc: {
      total: clients.length,
      aEnvoyer: clients.filter((c) => !c.fcc_statut || c.fcc_statut === "Non envoyé").length,
      envoye: clients.filter((c) => c.fcc_statut === "Envoyé").length,
      signe: clients.filter((c) => c.fcc_statut === "Signé").length,
      renouveler: clients.filter((c) => c.fcc_statut === "À renouveler").length,
    },
  };

  const now = new Date();
  const threshold = new Date();
  threshold.setMonth(threshold.getMonth() + 6);

  const kycTodos: AccueilTodoItem[] = [];
  for (const doc of kycDocs) {
    if (!doc.client_id) continue;
    const client = clients.find((c) => c.id === doc.client_id);
    if (!client) continue;
    const isIdDoc = ID_DOC_TYPES.some((t) => doc.doc_type.toLowerCase().includes(t.toLowerCase()));
    if (!isIdDoc) continue;
    const expiry = doc.date_validite ? new Date(doc.date_validite) : null;
    const expired = expiry ? expiry < now : false;
    const expiringSoon = expiry ? expiry <= threshold : false;
    if (!expiringSoon && !expired) continue;
    kycTodos.push({
      id: `kyc-doc-${doc.id}`,
      clientId: client.id,
      clientName: clientMapper.resolveClientDisplayName(client),
      label: `${doc.doc_type} — ${expired ? "expiré" : "expire bientôt"}`,
      priority: expired ? 1 : 2,
      kind: "kyc_doc",
    });
  }

  const complianceTodos: AccueilTodoItem[] = [];
  for (const client of clients) {
    const name = clientMapper.resolveClientDisplayName(client);
    if (!client.der_statut || client.der_statut === "Non envoyé") {
      complianceTodos.push({
        id: `der-${client.id}`,
        clientId: client.id,
        clientName: name,
        label: "DER à envoyer",
        priority: 1,
        kind: "compliance",
      });
      continue;
    }
    if (
      derIsSent(client.der_statut) &&
      ldmIsUnlocked(client.der_date) &&
      (!client.ldm_statut || client.ldm_statut === "Non envoyé")
    ) {
      complianceTodos.push({
        id: `ldm-${client.id}`,
        clientId: client.id,
        clientName: name,
        label: "Lettre de mission à envoyer",
        priority: 2,
        kind: "compliance",
      });
      continue;
    }
    if (!client.fcc_statut || client.fcc_statut === "Non envoyé") {
      complianceTodos.push({
        id: `fcc-${client.id}`,
        clientId: client.id,
        clientName: name,
        label: "FCC à envoyer",
        priority: 3,
        kind: "compliance",
      });
      continue;
    }
    if (client.fcc_statut === "À renouveler") {
      complianceTodos.push({
        id: `fcc-renew-${client.id}`,
        clientId: client.id,
        clientName: name,
        label: "FCC à renouveler",
        priority: 4,
        kind: "compliance",
      });
    }
  }

  complianceTodos.sort((a, b) => a.priority - b.priority);
  kycTodos.sort((a, b) => a.priority - b.priority);

  const data: AccueilResponse = { stats, kycTodos, complianceTodos };
  res.json(data);
}));

export default router;
