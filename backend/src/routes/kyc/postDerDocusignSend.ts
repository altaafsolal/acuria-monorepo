import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/index.js";
import { clientsRepo, tenantsRepo } from "../../services/baserow/index.js";
import { asyncHandler, HttpError, requireTenant } from "../../utils/index.js";
import type { SendDerInput } from "../../types/domain.js";
import { postWebhook, webhookUrl } from "../../services/make/http.js";
import { env } from "../../config/env.js";

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole("tenant_admin", "standard_user"));

router.post(
  "/der/docusign",
  asyncHandler(async (req, res) => {
    const tenantId = requireTenant(req);
    const body = req.body as SendDerInput;

    if (!body?.clientId || !body?.signataireName || !body?.signataireEmail) {
      throw new HttpError(
        400,
        "clientId, signataireName and signataireEmail are required",
      );
    }

    try {
      const [client, tenant] = await Promise.all([
        clientsRepo.getClientById(tenantId, body.clientId),
        tenantsRepo.findTenantById(tenantId),
      ]);
      if (!client) throw new Error("Client not found");
      if (!client.email) throw new Error("Email client manquant");

      const isPP = client.client_type === "PP";
      const nomClient = isPP
        ? [client.first_name, client.last_name?.toUpperCase()]
            .filter(Boolean)
            .join(" ")
        : (client.trade_name || client.name || "").toUpperCase();
      const nomFile = nomClient.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30);
      const today = new Date().toISOString().split("T")[0];
      const nmTitre =
        body.signataireName === "Baptiste Money"
          ? "Président"
          : "Directeur Général Délégué";
      const ldmType = body.ldmType || "";
      const ldmTemplateIds: Record<string, string> = {
        PP_SANS: env.kyc.ldmTemplatePpSans,
        PP_AVEC: env.kyc.ldmTemplatePpAvec,
        PM_SANS: env.kyc.ldmTemplatePmSans,
        PM_AVEC: env.kyc.ldmTemplatePmAvec,
      };

      await postWebhook(webhookUrl("webhookDerDocusign"), {
        record_id: client.id,
        tenant_id: tenantId,
        ldm_template_id: ldmType ? ldmTemplateIds[ldmType] || "" : "",
        der_template_id: env.kyc.derTemplateId,
        ldm_filename: ldmType ? `${nomFile}_LDM_${today}` : "",
        der_filename: `${nomFile}_DER_${today}`,
        client_name: nomClient,
        email_client: client.email,
        civilite_nom_prenom: isPP
          ? [
              client.civilite,
              client.first_name,
              client.last_name?.toUpperCase(),
            ]
              .filter(Boolean)
              .join(" ")
          : "",
        adresse_complete: isPP
          ? [client.address, client.postal_code, client.city]
              .filter(Boolean)
              .join(", ")
          : "",
        date_naissance:
          isPP && client.birth_date
            ? new Date(client.birth_date).toLocaleDateString("fr-FR")
            : "",
        lieu_naissance: isPP ? client.birth_place || "" : "",
        nm_name: body.signataireName,
        nm_email: body.signataireEmail,
        nm_signataire: body.signataireName,
        nm_titre: nmTitre,
        montant_forfait: ldmType.endsWith("AVEC")
          ? body.montantForfait || ""
          : "",
        denomination: !isPP ? client.trade_name || client.name || "" : "",
        capital: !isPP ? client.capital || client.equity || "" : "",
        addresse_siege: !isPP
          ? [client.address, client.postal_code, client.city]
              .filter(Boolean)
              .join(", ")
          : "",
        rcs_ville: !isPP ? client.city || "" : "",
        siren: !isPP ? client.siren || "" : "",
        representant_nom: !isPP ? client.legal_rep_name || "" : "",
        tenant_sharepoint: tenant?.sharepoint_path_base || "",
        tenant_name: tenant?.branding_name || tenant?.name || "",
      });

      const updated = await clientsRepo.patchClientKycFields(
        tenantId,
        client.id,
        {
          der_statut: "Envoyé",
          der_date: today,
          ldm_statut: "Envoyé",
          ldm_date: today,
        },
      );

      // Status update is deferred to /api/webhooks/kyc/docusign-complete (called by Make on completion).
      res.json({
        client: updated
          ? clientsRepo.toPublicClient(updated)
          : clientsRepo.toPublicClient(client),
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to send DER via DocuSign";
      throw new HttpError(400, message);
    }
  }),
);

export default router;
