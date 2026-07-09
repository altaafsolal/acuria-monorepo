import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/index.js";
import {
  clientsRepo,
  tenantsRepo,
  clientMapper,
} from "../../services/baserow/index.js";
import { buildFccPrefillLink } from "../../services/make/index.js";
import { asyncHandler, HttpError, requireTenant } from "../../utils/index.js";
import { postWebhook, webhookUrl } from "../../services/make/http.js";

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole("tenant_admin", "standard_user"));

router.post(
  "/fcc/send",
  asyncHandler(async (req, res) => {
    const tenantId = requireTenant(req);
    const { clientId } = req.body as { clientId?: string };

    if (!clientId) {
      throw new HttpError(400, "clientId is required");
    }

    try {
      const [client, tenant] = await Promise.all([
        clientsRepo.getClientById(tenantId, clientId),
        tenantsRepo.findTenantById(tenantId),
      ]);
      if (!client) throw new Error("Client not found");

      const tenantBranding = tenant
        ? {
            id: tenant.id,
            name: tenant.branding_name || tenant.name,
            orias: tenant.branding_orias,
            email: tenant.email,
          }
        : undefined;
      const { link } = buildFccPrefillLink(client, tenantBranding);
      const name = clientMapper.resolveClientDisplayName(client);
      const tenantName = tenant?.branding_name || tenant?.name || "";
      const tenantEmail = tenant?.email || "";

      if (client.email) {
        await postWebhook(webhookUrl("webhookFccSend"), {
          client_email: client.email,
          client_name: name,
          lien_prefill: link,
          tenant_name: tenantName,
          tenant_email: tenantEmail,
        });

        const updated = await clientsRepo.patchClientKycFields(
          tenantId,
          client.id,
          {
            fcc_statut: "Envoyé",
            fcc_date: new Date().toISOString().split("T")[0],
          },
        );
        res.json({ client: clientsRepo.toPublicClient(updated!), link });
        return;
      }

      res.json({ client: clientsRepo.toPublicClient(client), link });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send FCC";
      throw new HttpError(400, message);
    }
  }),
);

export default router;
