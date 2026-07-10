import { Router } from "express";
import { authenticate, requireRole, requireTenant} from "../../middleware/index.js";
import { clientsRepo, tenantsRepo } from "../../services/baserow/index.js";
import { asyncHandler, HttpError} from "../../utils/index.js";
import type { SendLdmInput } from "../../types/domain.js";
import { postWebhook, webhookUrl } from "../../services/make/http.js";
import { env } from "../../config/env.js";

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole("tenant_admin", "standard_user"), requireTenant);

router.post(
  "/ldm/preview",
  asyncHandler(async (req, res) => {
    const tenantId = req.tenantId!;
    const body = req.body as SendLdmInput;

    if (!body?.clientId || !body?.ldmType) {
      throw new HttpError(400, "clientId and ldmType are required");
    }

    try {
      const [client, tenant] = await Promise.all([
        clientsRepo.getClientById(tenantId, body.clientId),
        tenantsRepo.findTenantById(tenantId),
      ]);
      if (!client) throw new Error("Client not found");

      const isPP = client.client_type === "PP";
      const nomClient = isPP
        ? [client.first_name, client.last_name?.toUpperCase()]
            .filter(Boolean)
            .join(" ")
        : (client.trade_name || client.name || "").toUpperCase();
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

      const resp = await postWebhook(webhookUrl("webhookPreview"), {
        ldm_template_id: ldmType ? ldmTemplateIds[ldmType] || "" : "",
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
        tenant_name: tenant?.branding_name || tenant?.name || "",
      });
      const arrayBuffer = await resp.arrayBuffer();
      const pdfBuffer = Buffer.from(arrayBuffer);

      res.set("Content-Type", "application/pdf");
      res.send(pdfBuffer);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to generate preview";
      throw new HttpError(400, message);
    }
  }),
);

export default router;
