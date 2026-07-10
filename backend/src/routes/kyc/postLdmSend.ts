import { Router } from "express";
import { authenticate, requireRole, requireTenant} from "../../middleware/index.js";
import { clientsRepo, tenantsRepo } from "../../services/baserow/index.js";
import {
  derIsSent,
  ldmAvailableDate,
  ldmIsUnlocked,
} from "../../services/make/index.js";
import { asyncHandler, HttpError} from "../../utils/index.js";
import type { SendLdmInput } from "../../types/domain.js";
import { postWebhook, webhookUrl } from "../../services/make/http.js";
import { env } from "../../config/env.js";

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole("tenant_admin", "standard_user"), requireTenant);

router.post(
  "/ldm/send",
  asyncHandler(async (req, res) => {
    const tenantId = req.tenantId!;
    const body = req.body as SendLdmInput;

    if (
      !body?.clientId ||
      !body?.signataireName ||
      !body?.signataireEmail ||
      !body?.ldmType
    ) {
      throw new HttpError(
        400,
        "clientId, signataireName, signataireEmail and ldmType are required",
      );
    }

    try {
      const [client, tenant] = await Promise.all([
        clientsRepo.getClientById(tenantId, body.clientId),
        tenantsRepo.findTenantById(tenantId),
      ]);
      if (!client) throw new Error("Client not found");
      if (!derIsSent(client.der_statut))
        throw new Error("La DER doit être envoyée avant la LdM");
      if (!ldmIsUnlocked(client.der_date)) {
        const avail = ldmAvailableDate(client.der_date);
        throw new Error(
          `LdM disponible à partir du ${avail?.toLocaleDateString("fr-FR")} (délai AMF 48h)`,
        );
      }

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
      const ldmType = body.ldmType;
      const ldmTemplateIds: Record<string, string> = {
        PP_SANS: env.kyc.ldmTemplatePpSans,
        PP_AVEC: env.kyc.ldmTemplatePpAvec,
        PM_SANS: env.kyc.ldmTemplatePmSans,
        PM_AVEC: env.kyc.ldmTemplatePmAvec,
      };

      await postWebhook(webhookUrl("webhookLdm"), {
        ldm_template_id: ldmTemplateIds[ldmType] || "",
        civilite_nom_prenom: isPP
          ? [
              client.civilite,
              client.first_name,
              client.last_name?.toUpperCase(),
            ]
              .filter(Boolean)
              .join(" ")
          : "",
        date_naissance:
          isPP && client.birth_date
            ? new Date(client.birth_date).toLocaleDateString("fr-FR")
            : "",
        lieu_naissance: isPP ? client.birth_place || "" : "",
        email_client: client.email,
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
        client_name: nomClient,
        tenant_name: tenant?.branding_name || tenant?.name || "",
        ldm_filename: `${nomFile}_LDM_${today}`,
        nm_name: body.signataireName,
        nm_email: body.signataireEmail,
        der_filename: `${nomFile}_DER_${today}`,
        adresse_complete: isPP
          ? [client.address, client.postal_code, client.city]
              .filter(Boolean)
              .join(", ")
          : "",
      });

      const updated = await clientsRepo.patchClientKycFields(
        tenantId,
        client.id,
        {
          ldm_statut: "Envoyé",
          ldm_date: today,
        },
      );

      // Status update is deferred to /api/webhooks/kyc/ldm-complete (called by Make on completion).
      res.json({
        client: updated
          ? clientsRepo.toPublicClient(updated)
          : clientsRepo.toPublicClient(client),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send LdM";
      throw new HttpError(400, message);
    }
  }),
);

export default router;
