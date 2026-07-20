import { Router } from "express";
import { asyncHandler, verifyFccPrefillToken } from "../../utils/index.js";
import { webhookUrl, postWebhook } from "../../services/make/http.js";
import { sharepointBrokerFields } from "../../services/make/sharepoint.js";
import * as fccClientsRepo from "../../services/baserow/fcc-clients.js";
import * as clientsRepo from "../../services/baserow/clients.js";
import * as tenantsRepo from "../../services/baserow/tenants.js";

const router = Router({ mergeParams: true });

// Public form (clients fill it without login), but NOT unauthenticated: every
// submission must carry the signed prefill_token that `buildFccPrefillLink`
// issued. tenant_id / record_id come from the verified token only — the body's
// own tenant_id/record_id are ignored, so nobody can inject FCC data into a
// tenant they were never given a link for.
router.post(
  "/submit",
  asyncHandler(async (req, res) => {
    const payload = req.body as Record<string, unknown>;

    const str = (key: string) => {
      const v = payload[key];
      return typeof v === "string" ? v : null;
    };
    const num = (key: string) => {
      const v = payload[key];
      return typeof v === "number" ? v : null;
    };

    const claims = verifyFccPrefillToken(str("prefill_token"));
    if (!claims) {
      res.status(401).json({ error: "Invalid or missing prefill token" });
      return;
    }

    // Trust the token, never the body, for tenant/record binding.
    const tenantId = claims.tenant_id;
    const recordId = claims.record_id;
    const formType =
      typeof payload.form_type === "string" ? payload.form_type : "PP";

    // Lookup tenant for name and backoffice email
    const tenant = tenantId
      ? await tenantsRepo.findTenantById(tenantId).catch(() => null)
      : null;
    const tenantName = tenant?.branding_name || tenant?.name || "";
    const tenantBackofficeEmail = tenant?.backoffice_email || "";

    // Forward structured payload to Make webhook
    const makeResponse = await postWebhook(
      webhookUrl("webhookFccSubmit"),
      {
        tenant_name: tenantName,
        xlsx_filename: str("xlsx_filename") || "",
        xlsx_base64: str("xlsx_base64") || "",
        pdf_filename: str("pdf_filename") || "",
        pdf_base64: str("pdf_base64") || "",
        client_name: str("client_nom_complet") || "",
        form_type: formType,
        client_nom_complet: str("client_nom_complet") || "",
        client_email: str("client_email") || "",
        client_tel: str("client_tel") || "",
        client_ville: str("client_ville") || "",
        client_profession: str("client_profession") || "",
        profil_connaissance: str("profil_connaissance") || "",
        profil_risque: str("profil_risque") || "",
        score_total: num("score_total") ?? 0,
        user_agent: str("user_agent") || "",
        timestamp_soumission: str("timestamp_soumission") || "",
        form_id: str("form_id") || "",
        tenant_backoffice_email: tenantBackofficeEmail,
        ...sharepointBrokerFields(tenant),
      },
    );
    const makeData = (await makeResponse.json()) as {
      success?: boolean;
      sharepoint_url?: string;
      sharepoint_file_id?: string;
    };

    if (tenantId) {
      let clientId: string | null = null;
      if (recordId) {
        const client = await clientsRepo
          .getClientById(tenantId, recordId)
          .catch(() => null);
        if (client) clientId = client.id;
      }
      if (!clientId) {
        const clientEmail =
          typeof payload.client_email === "string" ? payload.client_email : null;
        if (clientEmail) {
          const all = await clientsRepo
            .listClientsByTenantId(tenantId)
            .catch(() => []);
          const match = all.find(
            (c) => c.email?.toLowerCase() === clientEmail.toLowerCase(),
          );
          if (match) clientId = match.id;
        }
      }

      await fccClientsRepo.createFccClient(tenantId, {
        clientId,
        formType,
        profilRisque: str("profil_risque"),
        profilConnaissance: str("profil_connaissance"),
        scoreConnaissance: num("score_connaissance"),
        scoreRisque: num("score_risque"),
        typeFormulaire: str("form_type"),
        idFormulaire: str("form_id"),
        dateSoumission: str("timestamp_soumission"),
        statutDossier: "En attente",
        client: str("client_nom_complet"),
        email: str("client_email"),
        telephone: str("client_tel"),
        ville: str("client_ville"),
        profession: str("client_profession"),
        scoreTotal: num("score_total"),
        sharepointFileUrl: makeData.sharepoint_url || null,
        sharepointFileId: makeData.sharepoint_file_id || null,
        ipClient: str("user_agent"),
        pdfFilename: str("pdf_filename"),
        prefillToken: str("prefill_token"),
        boAgent: str("bo_agent"),
        be1Nom: str("be1_nom"),
        be1Ddn: str("be1_ddn"),
        be1LieuNaissance: str("be1_lieu_naissance"),
        be1Nationalite: str("be1_nationalite"),
        be1ResidenceFiscale: str("be1_residence_fiscale"),
        be1Adresse: str("be1_adresse"),
        be1Detention: str("be1_detention"),
        be2Nom: str("be2_nom"),
        be2Ddn: str("be2_ddn"),
        be2LieuNaissance: str("be2_lieu_naissance"),
        be2Nationalite: str("be2_nationalite"),
        be2ResidenceFiscale: str("be2_residence_fiscale"),
        be2Adresse: str("be2_adresse"),
        be2Detention: str("be2_detention"),
        be3Nom: str("be3_nom"),
        be3Ddn: str("be3_ddn"),
        be3Nationalite: str("be3_nationalite"),
        be3Detention: str("be3_detention"),
        be4Nom: str("be4_nom"),
        be4Ddn: str("be4_ddn"),
        be4Nationalite: str("be4_nationalite"),
        be4Detention: str("be4_detention"),
        clientDenomination: str("client_denomination"),
        clientRepresentantNom: str("client_representant_nom"),
        clientRepresentantFonction: str("client_representant_fonction"),
        clientSiren: str("client_siren"),
        clientNaf: str("client_naf"),
        clientActivite: str("client_activite"),
        clientFormeJuridique: str("client_forme_juridique"),
        clientCa: str("client_ca"),
        clientBilan: str("client_bilan"),
        clientFondsPropres: str("client_fonds_propres"),
        clientFiscalite: str("client_fiscalite"),
      });

      if (clientId) {
        await clientsRepo
          .patchClientKycFields(tenantId, clientId, {
            fcc_statut: "Soumis",
            fcc_date: new Date().toISOString().split("T")[0],
          })
          .catch(() => undefined);
      }
    }

    res.json({ ok: true });
  }),
);

export default router;
